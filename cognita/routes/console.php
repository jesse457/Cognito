<?php

declare(strict_types=1);

use App\Jobs\ComputeCohortAnalyticsJob;
use App\Jobs\PruneOldAuditLogsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Cognita scheduler
|--------------------------------------------------------------------------
|
| Instructor-scoped work is gated on the flag at schedule time, so with the
| portal disabled no instructor job is queued at all (the job also guards
| internally and exits before any query).
|
*/

Schedule::job(new ComputeCohortAnalyticsJob)
    ->dailyAt('02:00')
    ->when(fn (): bool => (bool) config('features.instructor_path'));

Schedule::command('cognita:rebuild-leaderboards')->hourly();

Schedule::job(new PruneOldAuditLogsJob)->monthly();

Schedule::command('cognita:expire-suspensions')->everyFifteenMinutes();
