<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\RealtimeProvider;
use App\Models\Answer;
use App\Models\Question;
use App\Services\PostEmbedder;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(RealtimeProvider::class, function (Application $app): RealtimeProvider {
            $driver = (string) config('realtime.driver', 'livekit');
            $class = config("realtime.drivers.{$driver}");

            if (! is_string($class) || ! class_exists($class)) {
                throw new RuntimeException(
                    "The realtime driver [{$driver}] is not registered. Add it to config/realtime.php.",
                );
            }

            return $app->make($class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Keep the searchable vector in step with the post it describes. The
        // embedder short-circuits when the content has not changed, so accepting
        // an answer or touching a timestamp does not call an AI provider.
        Question::saved(fn (Question $question) => app(PostEmbedder::class)->sync($question));
        Question::deleted(fn (Question $question) => app(PostEmbedder::class)->forget($question));
        Answer::saved(fn (Answer $answer) => app(PostEmbedder::class)->sync($answer));
        Answer::deleted(fn (Answer $answer) => app(PostEmbedder::class)->forget($answer));
    }
}
