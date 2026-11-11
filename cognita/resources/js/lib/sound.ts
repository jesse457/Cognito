/**
 * Sound cues for the call, synthesised with WebAudio.
 *
 * Nothing is downloaded: each cue is two or three short notes with a fast
 * envelope, which is enough to tell a join from a raised hand without a sample
 * library. The browser only allows audio after a gesture, so the context is
 * created on the first cue — which is always something the user just did.
 */
export type Cue = 'join' | 'leave' | 'message' | 'hand' | 'pen' | 'room' | 'error' | 'copy';

interface Note {
    /** Offset from the start of the cue, in seconds. */
    at: number;
    hz: number;
    ms: number;
    gain?: number;
    wave?: OscillatorType;
}

const CUES: Record<Cue, Note[]> = {
    join: [
        { at: 0, hz: 523.25, ms: 110 },
        { at: 0.1, hz: 783.99, ms: 170 },
    ],
    leave: [
        { at: 0, hz: 659.25, ms: 110 },
        { at: 0.1, hz: 440, ms: 180 },
    ],
    message: [{ at: 0, hz: 880, ms: 90, gain: 0.16 }],
    hand: [
        { at: 0, hz: 1046.5, ms: 80, gain: 0.16 },
        { at: 0.09, hz: 1318.51, ms: 120, gain: 0.14 },
    ],
    pen: [
        { at: 0, hz: 587.33, ms: 90, gain: 0.16 },
        { at: 0.08, hz: 880, ms: 140, gain: 0.14 },
    ],
    room: [
        { at: 0, hz: 523.25, ms: 90 },
        { at: 0.09, hz: 659.25, ms: 90 },
        { at: 0.18, hz: 783.99, ms: 160 },
    ],
    error: [
        { at: 0, hz: 311.13, ms: 130, gain: 0.16, wave: 'triangle' },
        { at: 0.12, hz: 233.08, ms: 200, gain: 0.14, wave: 'triangle' },
    ],
    copy: [{ at: 0, hz: 1318.51, ms: 70, gain: 0.12 }],
};

const MUTE_KEY = 'cognita.sound.muted';

let context: AudioContext | null = null;

export function soundMuted(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

export function muteSound(muted: boolean): void {
    try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
        /* preference is best-effort */
    }
}

export function playCue(cue: Cue): void {
    if (soundMuted()) {
        return;
    }

    const audio = audioContext();

    if (audio === null) {
        return;
    }

    const start = audio.currentTime + 0.01;
    const bus = audio.createGain();
    bus.gain.value = 0.5;
    bus.connect(audio.destination);

    for (const note of CUES[cue]) {
        playNote(audio, bus, start + note.at, note);
    }
}

function playNote(audio: AudioContext, bus: GainNode, at: number, note: Note): void {
    const seconds = note.ms / 1000;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    const peak = note.gain ?? 0.18;

    oscillator.type = note.wave ?? 'sine';
    oscillator.frequency.setValueAtTime(note.hz, at);

    // A short attack and a smooth decay: a bell rather than a click.
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

    oscillator.connect(envelope).connect(bus);
    oscillator.start(at);
    oscillator.stop(at + seconds + 0.02);
}

function audioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (context === null) {
        const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (Ctor === undefined) {
            return null;
        }

        context = new Ctor();
    }

    // Browsers park the context until a gesture; every cue follows one.
    if (context.state === 'suspended') {
        void context.resume();
    }

    return context;
}
