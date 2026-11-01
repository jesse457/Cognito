<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\GamificationService;
use Illuminate\Console\Command;

class RebuildLeaderboards extends Command
{
    protected $signature = 'cognita:rebuild-leaderboards';

    protected $description = 'Recompute weekly and all-time leaderboard ranks for every course';

    public function handle(GamificationService $gamification): int
    {
        $ranked = $gamification->syncLeaderboardRanks();

        $this->info("Rebuilt leaderboard ranks: {$ranked} row(s) ranked.");

        return self::SUCCESS;
    }
}
