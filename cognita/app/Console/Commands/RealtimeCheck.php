<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\RealtimeProvider;
use Illuminate\Console\Command;

/**
 * Answers "why does the call not connect?" without opening a browser.
 *
 * Every check is the real thing: an HTTP request to the address the browser
 * would dial, a token round trip through the provider's own validator, and a UDP
 * STUN exchange with the media port. Run it after starting the call server, and
 * again from a machine that cannot join.
 */
class RealtimeCheck extends Command
{
    protected $signature = 'realtime:check
        {--url= : Check this call server address instead of the configured one}
        {--json : Print the result as JSON}';

    protected $aliases = ['livekit:check'];

    protected $description = 'Verify the realtime provider: configuration, signal, credentials and media';

    public function handle(RealtimeProvider $provider): int
    {
        $override = is_string($this->option('url')) ? trim((string) $this->option('url')) : '';

        if ($override !== '') {
            config([
                'services.livekit.url' => $override,
                'services.livekit.url_mode' => 'fixed',
            ]);
        }

        $report = $provider->diagnose();
        $failed = array_values(array_filter($report['checks'], fn (array $check): bool => $check['ok'] === false));

        if ($this->option('json') === true) {
            $this->line((string) json_encode(
                [
                    'driver' => $provider->driver(),
                    'url' => $report['url'],
                    'ok' => $failed === [],
                    'checks' => $report['checks'],
                ],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES,
            ));

            return $failed === [] ? self::SUCCESS : self::FAILURE;
        }

        $this->components->info(sprintf('Realtime health check (%s) for %s', $provider->driver(), $report['url']));

        foreach ($report['checks'] as $check) {
            $this->components->twoColumnDetail(
                ($check['ok'] ? '<fg=green>OK</>' : '<fg=red>FAIL</>').'  '.$check['label'],
                '<fg=gray>'.$check['detail'].'</>',
            );
        }

        $this->newLine();

        if ($failed !== []) {
            $this->components->error('The group call cannot work until the failing checks above pass.');
            $this->line('  <fg=gray>Start or restart the server with</> .dev/livekit.sh <fg=gray>and rerun this command.</>');

            return self::FAILURE;
        }

        $this->components->info('All checks passed: the call server is reachable and media flows.');

        if ($override !== '') {
            // --url only moved this one command; the app still derives the
            // address from whichever host opens the page.
            $this->line('  <fg=gray>Checked</> '.$report['url'].'<fg=gray> on request. The app itself hands every visitor the address of the host they loaded it from.</>');
        } else {
            $this->line('  <fg=gray>Address follows the page: a device that loads the app at http://HOST:8000 dials</> ws://HOST:7880<fg=gray>.</>');
        }

        return self::SUCCESS;
    }
}
