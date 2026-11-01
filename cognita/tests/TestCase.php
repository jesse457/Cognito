<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Every suite starts with both optional surfaces OFF unless its base
        // class booted the application with the flag enabled.
        config([
            'features.instructor_path' => (bool) env('FEATURE_INSTRUCTOR_PATH', false),
            'features.social' => (bool) env('FEATURE_SOCIAL', false),
        ]);
    }
}
