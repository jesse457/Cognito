<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\HumanTime;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

/**
 * The dashboard's time phrasing, against a clock that never moves.
 */
class HumanTimeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-05 12:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_durations_read_the_way_a_person_says_them(): void
    {
        $this->assertSame('0s', HumanTime::duration(0));
        $this->assertSame('0s', HumanTime::duration(-30));
        $this->assertSame('45s', HumanTime::duration(45));
        $this->assertSame('1 min', HumanTime::duration(60));
        $this->assertSame('12 min', HumanTime::duration(754));
        $this->assertSame('1 h', HumanTime::duration(3600));
        $this->assertSame('1 h 12 min', HumanTime::duration(4320));
        $this->assertSame('3 h', HumanTime::duration(10_800));
    }

    public function test_the_recent_past_is_relative(): void
    {
        $this->assertSame('never', HumanTime::ago(null));
        $this->assertSame('just now', HumanTime::ago(Carbon::now()->subSeconds(30)));
        $this->assertSame('12 min ago', HumanTime::ago(Carbon::now()->subMinutes(12)));
        $this->assertSame('3 h ago', HumanTime::ago(Carbon::now()->subHours(3)));
        $this->assertSame('yesterday', HumanTime::ago(Carbon::now()->subDay()));
        $this->assertSame('4 days ago', HumanTime::ago(Carbon::now()->subDays(4)));
    }

    public function test_anything_older_than_a_week_gets_a_date(): void
    {
        $this->assertSame('6 Oct', HumanTime::ago(Carbon::now()->subDays(30)));
    }

    public function test_a_day_is_named_when_it_is_today_or_yesterday(): void
    {
        $this->assertSame('Never', HumanTime::day(null));
        $this->assertSame('Today', HumanTime::day(Carbon::now()->setTime(9, 12)));
        $this->assertSame('Yesterday', HumanTime::day(Carbon::now()->subDay()));
        $this->assertSame('Tue 3 Nov', HumanTime::day(Carbon::parse('2026-11-03')));
    }

    public function test_an_attendance_row_gets_a_day_and_a_time(): void
    {
        $this->assertSame('Today · 09:12', HumanTime::dayAt(Carbon::now()->setTime(9, 12)));
        $this->assertSame('Never', HumanTime::dayAt(null));
    }
}
