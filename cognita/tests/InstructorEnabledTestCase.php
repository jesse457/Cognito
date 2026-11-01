<?php

declare(strict_types=1);

namespace Tests;

/**
 * Base class for suites that require the instructor portal to be MOUNTED.
 *
 * Route registration happens during application boot, so the flag has to be set
 * in the real environment before the app is created — flipping config() inside a
 * test would leave the routes unmounted (which is exactly the behaviour the
 * disabled-route test asserts).
 */
abstract class InstructorEnabledTestCase extends TestCase
{
    protected function setUp(): void
    {
        putenv('FEATURE_INSTRUCTOR_PATH=true');
        $_ENV['FEATURE_INSTRUCTOR_PATH'] = 'true';
        $_SERVER['FEATURE_INSTRUCTOR_PATH'] = 'true';

        parent::setUp();

        config(['features.instructor_path' => true]);
    }

    protected function tearDown(): void
    {
        putenv('FEATURE_INSTRUCTOR_PATH=false');
        $_ENV['FEATURE_INSTRUCTOR_PATH'] = 'false';
        $_SERVER['FEATURE_INSTRUCTOR_PATH'] = 'false';

        parent::tearDown();
    }
}
