/**
 * The one place a transport is chosen.
 *
 * The server names its provider (`realtime.driver`); this registry maps that
 * name to a client adapter. Adding a provider means adding one entry here and
 * one class under app/Realtime — no component, no hook and no board code
 * changes.
 */
import { LiveKitTransport } from './livekit-transport';
import { LocalTransport } from './local-transport';
import type { CallTransport, RealtimeConfig, TransportFactory, TransportOptions } from './types';

export * from './protocol';
export type * from './types';
export { JOIN_PHASE_LABEL, disconnectReasonMessage, joinError, microphoneError } from './messages';

const FACTORIES: Record<string, TransportFactory> = {
    livekit: (config, options) => new LiveKitTransport(config, options),
    local: (config, options) => new LocalTransport(config, options),
};

export function createCallTransport(config: RealtimeConfig, options: TransportOptions): CallTransport {
    // No provider credentials on this server? The local adapter still gives a
    // working board across tabs, which is better than a dead page.
    const driver = config.configured ? config.driver : 'local';
    const factory = FACTORIES[driver] ?? FACTORIES.local;

    return factory(config, options);
}
