<?php

declare(strict_types=1);

namespace Tests;

/**
 * Base class for suites that require the community/forum surface to be mounted.
 */
abstract class SocialEnabledTestCase extends TestCase
{
    protected function setUp(): void
    {
        putenv('FEATURE_SOCIAL=true');
        $_ENV['FEATURE_SOCIAL'] = 'true';
        $_SERVER['FEATURE_SOCIAL'] = 'true';

        parent::setUp();

        config(['features.social' => true]);
    }

    protected function tearDown(): void
    {
        putenv('FEATURE_SOCIAL=false');
        $_ENV['FEATURE_SOCIAL'] = 'false';
        $_SERVER['FEATURE_SOCIAL'] = 'false';

        parent::tearDown();
    }
}
