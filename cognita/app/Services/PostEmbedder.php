<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Answer;
use App\Models\PostEmbedding;
use App\Models\Question;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Throwable;

/**
 * Keeps one vector per question or answer body and provides the fallback used
 * when no embedding provider is configured.
 *
 * The local fallback is deliberately boring: hashed word, bigram and character
 * trigram features, signed into a fixed-size vector and L2-normalised. It is not
 * a substitute for a trained model, but it is deterministic, needs no network,
 * and still gives pgvector useful neighbourhoods for the community search.
 */
class PostEmbedder
{
    private static ?string $resolvedUrl = null;

    /** @var list<string> */
    private const STOPWORDS = [
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does',
        'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
        'its', 'me', 'my', 'not', 'of', 'on', 'or', 'our', 'so', 'than', 'that', 'the',
        'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'we',
        'were', 'what', 'when', 'where', 'which', 'why', 'will', 'with', 'would', 'you',
        'your',
    ];

    public function sync(Question|Answer $post): void
    {
        $content = $this->contentFor($post);

        if ($content === '') {
            return;
        }

        $existing = PostEmbedding::query()
            ->where('embeddable_type', $post::class)
            ->where('embeddable_id', $post->getKey())
            ->first();

        if ($existing !== null && $existing->content === $content) {
            return;
        }

        PostEmbedding::query()->updateOrCreate(
            [
                'embeddable_type' => $post::class,
                'embeddable_id' => $post->getKey(),
            ],
            [
                'content' => $content,
                'embedding' => $this->embed($content),
            ],
        );
    }

    public function forget(Question|Answer $post): void
    {
        PostEmbedding::query()
            ->where('embeddable_type', $post::class)
            ->where('embeddable_id', $post->getKey())
            ->delete();
    }

    /**
     * @return array<int, float>
     */
    public function embed(string $text, bool $query = false): array
    {
        $provider = $this->provider();

        if ($provider !== null) {
            $this->configureProvider($provider);

            try {
                // Laravel AI's Stringable macro is the SDK entry point for a
                // single text embedding. It handles the provider driver,
                // dimensions, model defaults and failover for us.
                $vector = Str::of($this->prompt($text, $query))->toEmbeddings(
                    provider: $provider,
                    dimensions: $this->dimensions(),
                    model: $this->model($provider),
                );

                if (count($vector) === $this->dimensions() && $this->isFinite($vector)) {
                    return array_map(static fn (float|int $value): float => (float) $value, $vector);
                }
            } catch (Throwable $exception) {
                // A provider outage must not stop a question from being posted.
                report($exception);
            }
        }

        return $this->localEmbedding($text);
    }

    private function contentFor(Question|Answer $post): string
    {
        if ($post instanceof Question) {
            $tags = implode(', ', $post->tags ?? []);

            return trim(implode("\n", array_filter([
                'Question: '.$post->title,
                $tags === '' ? null : 'Tags: '.$tags,
                $post->body,
            ])));
        }

        $question = $post->relationLoaded('question') ? $post->question : $post->question()->first();

        return trim(implode("\n", array_filter([
            $question === null ? null : 'Question: '.$question->title,
            $post->body,
        ])));
    }

    private function provider(): ?string
    {
        $configured = config('embeddings.provider');

        if (is_string($configured) && trim($configured) !== '') {
            $configured = trim($configured);

            $url = config('embeddings.url');

            if ($configured === 'openai-compatible'
                && is_string($url)
                && trim($url) === 'auto'
                && $this->resolveUrl() === null) {
                return null;
            }

            return $configured;
        }

        $default = config('ai.default_for_embeddings', 'openai');

        if (is_string($default) && filled(config("ai.providers.{$default}.key"))) {
            return $default;
        }

        return null;
    }

    private function model(string $provider): ?string
    {
        $model = config('embeddings.model');

        return is_string($model) && trim($model) !== '' ? trim($model) : null;
    }

    /**
     * Point the SDK's openai-compatible driver at a local llama-server. "auto"
     * resolves the Windows host address from WSL, so a changing DHCP lease does
     * not require editing .env after every reboot.
     */
    private function configureProvider(string $provider): void
    {
        if ($provider !== 'openai-compatible') {
            return;
        }

        $url = $this->resolveUrl();

        if ($url === null) {
            return;
        }

        config()->set('ai.providers.openai-compatible.url', $url);

        $key = config('embeddings.key');

        if (is_string($key) && trim($key) !== '') {
            config()->set('ai.providers.openai-compatible.key', trim($key));
        }
    }

    private function resolveUrl(): ?string
    {
        $url = config('embeddings.url');

        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $url = trim($url);

        if ($url !== 'auto') {
            return rtrim($url, '/');
        }

        if (self::$resolvedUrl !== null) {
            return self::$resolvedUrl;
        }

        try {
            $result = Process::timeout(15)->run([
                'powershell.exe',
                '-NoProfile',
                '-Command',
                '(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress',
            ]);

            $ip = trim($result->output());

            if (filter_var($ip, FILTER_VALIDATE_IP) !== false) {
                return self::$resolvedUrl = 'http://'.$ip.':'.$this->port().'/v1';
            }
        } catch (Throwable) {
            // Non-WSL hosts can set EMBEDDINGS_URL explicitly.
        }

        return null;
    }

    private function prompt(string $text, bool $query): string
    {
        $prefix = $query ? config('embeddings.query_prefix') : config('embeddings.document_prefix');

        if (is_string($prefix) && trim($prefix) !== '') {
            return $prefix.$text;
        }

        if (! $this->isEmbeddingGemma()) {
            return $text;
        }

        return ($query ? 'task: search result | query: ' : 'title: none | text: ').$text;
    }

    private function isEmbeddingGemma(): bool
    {
        return str_contains(mb_strtolower((string) config('embeddings.model')), 'embeddinggemma');
    }

    private function dimensions(): int
    {
        return max(1, (int) config('embeddings.dimensions', 768));
    }

    private function port(): int
    {
        return max(1, (int) config('embeddings.port', 8081));
    }

    /**
     * @param  array<int, float|int>  $vector
     */
    private function isFinite(array $vector): bool
    {
        foreach ($vector as $value) {
            if (! is_finite((float) $value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<int, float>
     */
    private function localEmbedding(string $text): array
    {
        $vector = array_fill(0, $this->dimensions(), 0.0);

        foreach ($this->features($text) as $feature => $weight) {
            $index = crc32($feature) % $this->dimensions();
            $sign = (crc32('sign:'.$feature) & 1) === 0 ? 1.0 : -1.0;

            $vector[$index] += $weight * $sign;
        }

        $magnitude = sqrt(array_sum(array_map(static fn (float $value): float => $value * $value, $vector)));

        if ($magnitude === 0.0) {
            $vector[crc32($text) % $this->dimensions()] = 1.0;
            $magnitude = 1.0;
        }

        return array_map(static fn (float $value): float => round($value / $magnitude, 8), $vector);
    }

    /**
     * @return array<string, float>
     */
    private function features(string $text): array
    {
        $normalised = mb_strtolower($text);
        $normalised = preg_replace('/[^\p{L}\p{N}+#]+/u', ' ', $normalised) ?? '';
        $tokens = preg_split('/\s+/u', trim($normalised)) ?: [];
        $tokens = array_values(array_filter(
            $tokens,
            static fn (string $token): bool => $token !== ''
                && ! in_array($token, self::STOPWORDS, true)
                && mb_strlen($token) > 1,
        ));

        $tokens = array_slice($tokens, 0, 400);
        $features = [];

        foreach ($tokens as $index => $token) {
            $features[$token] = ($features[$token] ?? 0.0) + 1.0;

            $next = $tokens[$index + 1] ?? null;

            if ($next !== null) {
                $bigram = $token.' '.$next;
                $features[$bigram] = ($features[$bigram] ?? 0.0) + 0.45;
            }

            if (mb_strlen($token) >= 4) {
                $length = mb_strlen($token);

                for ($offset = 0; $offset + 3 <= $length; $offset++) {
                    $trigram = ' '.mb_substr($token, $offset, 3);
                    $features[$trigram] = ($features[$trigram] ?? 0.0) + 0.08;
                }
            }
        }

        return array_map(static fn (float $count): float => 1.0 + log($count), $features);
    }
}
