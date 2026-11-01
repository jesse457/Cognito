<?php

declare(strict_types=1);

namespace App\Services\KnowledgeTracing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Thin HTTP client for the Python KT microservice.
 *
 * Kept deliberately dumb: it either returns the decoded payload or throws, and
 * the caller (UpdateStudentMastery) decides how to degrade.
 */
class KtClient
{
    public function baseUrl(): string
    {
        return rtrim((string) config('features.kt_service_url'), '/');
    }

    public function timeout(): int
    {
        return (int) config('cognita.kt.http_timeout_seconds', 10);
    }

    /**
     * @param  list<array{kc_id:int, correct:int, timestamp:string}>  $history
     * @return array{mastery: list<array{kc_id:int, probability:float}>, engine: string}
     *
     * @throws RequestException|ConnectionException
     */
    public function predictMastery(int $userId, array $history): array
    {
        $response = Http::timeout($this->timeout())
            ->acceptJson()
            ->asJson()
            ->post($this->baseUrl().'/predict_mastery', [
                'user_id' => $userId,
                'history' => $history,
            ])
            ->throw();

        /** @var array{mastery?: list<array{kc_id:int, probability:float}>, engine?: string} $payload */
        $payload = $response->json();

        return [
            'mastery' => $payload['mastery'] ?? [],
            'engine' => strtolower((string) ($payload['engine'] ?? 'bkt')),
        ];
    }

    public function healthy(): bool
    {
        try {
            return Http::timeout($this->timeout())
                ->acceptJson()
                ->get($this->baseUrl().'/health')
                ->successful();
        } catch (Throwable) {
            return false;
        }
    }
}
