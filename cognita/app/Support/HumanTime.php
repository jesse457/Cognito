<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * The three time labels a dashboard needs, written once.
 *
 * Every number on the instructor and student dashboards is a *length of time*
 * or a *moment in the past*, and both read badly as raw values ("0.4 hours",
 * "2026-11-04 09:12"). These helpers turn them into the phrasing a person uses
 * out loud: "12 min", "just now", "Attended Mon 3 Nov".
 *
 * Kept free of Eloquent, of the app's own models and of the container so it can
 * be unit tested against a frozen clock.
 */
final class HumanTime
{
    /** A length of time: "0s", "45s", "12 min", "1 h 05 min", "3 h". */
    public static function duration(int $seconds): string
    {
        $seconds = max(0, $seconds);

        if ($seconds < 60) {
            return $seconds.'s';
        }

        if ($seconds < 3600) {
            return intdiv($seconds, 60).' min';
        }

        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        if ($minutes === 0) {
            return $hours.' h';
        }

        return sprintf('%d h %02d min', $hours, $minutes);
    }

    /**
     * How long ago: "just now", "12 min ago", "3 h ago", "yesterday",
     * "4 days ago", then a date for anything older than a week.
     */
    public static function ago(?CarbonInterface $at): string
    {
        if ($at === null) {
            return 'never';
        }

        $reference = Carbon::now();
        $delta = $reference->getTimestamp() - $at->getTimestamp();

        // A clock that runs slightly backwards should read as "just now", not
        // as a future event.
        if ($delta < 60) {
            return 'just now';
        }

        if ($delta < 3600) {
            return intdiv($delta, 60).' min ago';
        }

        if ($delta < 86_400) {
            return intdiv($delta, 3600).' h ago';
        }

        $days = (int) abs($at->copy()->startOfDay()->diffInDays($reference->copy()->startOfDay()));

        if ($days <= 1) {
            return 'yesterday';
        }

        if ($days < 7) {
            return $days.' days ago';
        }

        return $at->copy()->format('j M');
    }

    /** A day as a person says it: "Today", "Yesterday", "Mon 3 Nov". */
    public static function day(?CarbonInterface $at): string
    {
        if ($at === null) {
            return 'Never';
        }

        $today = Carbon::now()->startOfDay();
        $day = Carbon::parse($at)->startOfDay();

        if ($day->equalTo($today)) {
            return 'Today';
        }

        if ($day->equalTo($today->copy()->subDay())) {
            return 'Yesterday';
        }

        return $at->copy()->format('D j M');
    }

    /** "Today · 09:12", the label an attendance row wants. */
    public static function dayAt(?CarbonInterface $at): string
    {
        if ($at === null) {
            return 'Never';
        }

        return self::day($at).' · '.$at->copy()->format('H:i');
    }
}
