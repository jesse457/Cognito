/**
 * Local, on-device recording of a live class.
 *
 * The browser mixes the room's audio — this microphone, subscribed remote
 * voices and any screen-share audio — into one stream, paints whatever screen
 * is on the stage into a 720p canvas, and lets MediaRecorder encode the result.
 * When the recording stops the file is offered as a download. Nothing is
 * uploaded, no server egress is involved, and the backend never learns a
 * recording exists.
 *
 * MediaRecorder and canvas.captureStream are not equally supported, so the
 * class degrades to audio-only where video cannot be encoded.
 */

export interface RecordingResult {
    blob: Blob;
    mimeType: string;
    extension: string;
    durationMs: number;
    startedAt: Date;
    fileName: string;
}

export interface RecordingSource {
    /** The class being recorded: written on the slate and in the file name. */
    title: string;
    /** Every live audio track the room is carrying, this device included. */
    audio: () => MediaStreamTrack[];
    /** Whichever screen is on the stage right now, if any. */
    share: () => MediaStreamTrack | null;
}

const WIDTH = 1280;
const HEIGHT = 720;
const STAGE = '#121417';
const FRAME_RATE = 24;
const AUDIO_BITS_PER_SECOND = 96_000;
const VIDEO_BITS_PER_SECOND = 1_000_000;
const TIMESLICE_MS = 2_000;
const TRACK_SYNC_MS = 1_000;

const VIDEO_TYPES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
];

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2'];

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const scoped = window as unknown as {
        AudioContext?: AudioContextConstructor;
        webkitAudioContext?: AudioContextConstructor;
    };

    return scoped.AudioContext ?? scoped.webkitAudioContext ?? null;
}

/** Whether this browser can record at all. */
export function recordingSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        audioContextConstructor() !== null
    );
}

/** `01:23`, or `1:01:23` once a recording runs past the hour. */
export function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    const pad = (value: number): string => String(value).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/** A file name a person can find later: class, then the moment it started. */
export function recordingFileName(title: string, startedAt: Date, extension: string): string {
    const slug =
        title
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 60) || 'class';
    const pad = (value: number): string => String(value).padStart(2, '0');
    const stamp = [
        startedAt.getFullYear(),
        pad(startedAt.getMonth() + 1),
        pad(startedAt.getDate()),
        '-',
        pad(startedAt.getHours()),
        pad(startedAt.getMinutes()),
    ].join('');

    return `cognita-${slug}-${stamp}.${extension}`;
}

function extensionFor(mimeType: string): string {
    if (mimeType.includes('mp4')) {
        return mimeType.startsWith('audio/') ? 'm4a' : 'mp4';
    }

    if (mimeType.includes('ogg')) {
        return 'ogg';
    }

    return 'webm';
}

function pickSupported(types: string[]): string | null {
    if (typeof MediaRecorder.isTypeSupported !== 'function') {
        return null;
    }

    return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Hand the finished file to the browser's download flow. */
export function downloadRecording(result: RecordingResult): void {
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = result.fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Safari reads the blob lazily; give it a minute before reclaiming the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current === '' ? word : `${current} ${word}`;

        if (context.measureText(candidate).width <= maxWidth || current === '') {
            current = candidate;

            continue;
        }

        lines.push(current);
        current = word;

        if (lines.length === maxLines - 1) {
            break;
        }
    }

    if (current !== '' && lines.length < maxLines) {
        lines.push(current);
    }

    if (lines.length === maxLines && words.length > 0) {
        const joined = lines.join(' ');
        const consumed = joined.split(/\s+/).length;

        if (consumed < words.length) {
            let last = lines[lines.length - 1];

            while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
                last = last.slice(0, -1);
            }

            lines[lines.length - 1] = `${last.trimEnd()}…`;
        }
    }

    return lines;
}

export class LocalRecording {
    private readonly source: RecordingSource;
    private recorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private destination: MediaStreamAudioDestinationNode | null = null;
    private readonly sources = new Map<string, MediaStreamAudioSourceNode>();
    private canvas: HTMLCanvasElement | null = null;
    private canvasStream: MediaStream | null = null;
    private video: HTMLVideoElement | null = null;
    private boundShare: MediaStreamTrack | null = null;
    private frameTimer: number | null = null;
    private syncTimer: number | null = null;
    private chunks: Blob[] = [];
    private startedAt = new Date();
    private mimeType = '';
    private slateSecond = -1;
    private stopping: Promise<RecordingResult | null> | null = null;

    constructor(source: RecordingSource) {
        this.source = source;
    }

    async start(): Promise<void> {
        if (this.recorder !== null) {
            return;
        }

        if (!recordingSupported()) {
            throw new Error('This browser cannot record audio.');
        }

        const AudioContextImpl = audioContextConstructor();

        if (AudioContextImpl === null) {
            throw new Error('This browser cannot record audio.');
        }

        this.startedAt = new Date();
        this.chunks = [];
        this.slateSecond = -1;

        try {
            const context = new AudioContextImpl();
            this.audioContext = context;

            if (context.state === 'suspended') {
                await context.resume();
            }

            const destination = context.createMediaStreamDestination();
            this.destination = destination;
            this.syncAudio();

            const media = new MediaStream(destination.stream.getAudioTracks());
            const videoType = this.setupVideo();
            const audioOnlyType = pickSupported(AUDIO_TYPES);
            const mimeType = videoType ?? audioOnlyType ?? '';

            if (videoType !== null && this.canvasStream !== null) {
                this.canvasStream.getVideoTracks().forEach((track) => media.addTrack(track));
            }

            const options: MediaRecorderOptions = { audioBitsPerSecond: AUDIO_BITS_PER_SECOND };

            if (videoType !== null) {
                options.videoBitsPerSecond = VIDEO_BITS_PER_SECOND;
            }

            if (mimeType !== '') {
                options.mimeType = mimeType;
            }

            let recorder: MediaRecorder;

            try {
                recorder = new MediaRecorder(media, options);
            } catch (error) {
                if (videoType === null) {
                    throw error;
                }

                // Some browsers advertise a video container but refuse to
                // encode a canvas stream. Recording audio is better than
                // refusing to record the lesson.
                const videoTracks = this.canvasStream?.getVideoTracks() ?? [];

                this.discardVideo();
                videoTracks.forEach((track) => media.removeTrack(track));

                const audioMime = audioOnlyType ?? '';

                recorder = new MediaRecorder(
                    media,
                    audioMime === ''
                        ? { audioBitsPerSecond: AUDIO_BITS_PER_SECOND }
                        : { audioBitsPerSecond: AUDIO_BITS_PER_SECOND, mimeType: audioMime },
                );
                this.mimeType = recorder.mimeType || audioMime;
            }

            this.mimeType = recorder.mimeType || this.mimeType || mimeType;
            this.recorder = recorder;

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }
            };

            recorder.onerror = () => {
                if (recorder.state !== 'inactive') {
                    try {
                        recorder.stop();
                    } catch {
                        /* the stop path below still resolves the promise */
                    }
                }
            };

            recorder.start(TIMESLICE_MS);
            this.syncTimer = window.setInterval(() => this.syncAudio(), TRACK_SYNC_MS);
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    async stop(): Promise<RecordingResult | null> {
        if (this.stopping !== null) {
            return this.stopping;
        }

        const recorder = this.recorder;

        if (recorder === null) {
            return null;
        }

        this.recorder = null;
        const stopping = new Promise<RecordingResult | null>((resolve) => {
            const finish = (): void => {
                void this.finish(recorder).then(resolve);
            };

            recorder.onstop = finish;

            if (recorder.state === 'inactive') {
                finish();

                return;
            }

            try {
                recorder.stop();
            } catch {
                finish();
            }
        });

        this.stopping = stopping;
        void stopping.finally(() => {
            if (this.stopping === stopping) {
                this.stopping = null;
            }
        });

        return stopping;
    }

    private async finish(recorder: MediaRecorder): Promise<RecordingResult | null> {
        const mimeType = recorder.mimeType || this.mimeType;
        const blob = new Blob(this.chunks, mimeType === '' ? undefined : { type: mimeType });
        const durationMs = Math.max(0, Date.now() - this.startedAt.getTime());
        const startedAt = this.startedAt;

        this.cleanup();

        if (blob.size === 0) {
            return null;
        }

        const extension = extensionFor(mimeType);

        return {
            blob,
            mimeType,
            extension,
            durationMs,
            startedAt,
            fileName: recordingFileName(this.source.title, startedAt, extension),
        };
    }

    /**
     * Keep the mix in step with the room. Tracks appear when someone unmutes,
     * joins or starts sharing, and disappear when they leave, so the set is
     * re-read every second rather than frozen at the moment Record was pressed.
     */
    private syncAudio(): void {
        const context = this.audioContext;
        const destination = this.destination;

        if (context === null || destination === null) {
            return;
        }

        const wanted = new Map<string, MediaStreamTrack>();

        for (const track of this.source.audio()) {
            if (track.readyState === 'live') {
                wanted.set(track.id, track);
            }
        }

        for (const [id, node] of this.sources) {
            if (!wanted.has(id)) {
                node.disconnect();
                this.sources.delete(id);
            }
        }

        for (const [id, track] of wanted) {
            if (this.sources.has(id)) {
                continue;
            }

            try {
                const node = context.createMediaStreamSource(new MediaStream([track]));
                node.connect(destination);
                this.sources.set(id, node);
            } catch {
                /* the track ended between the readyState check and the connect */
            }
        }
    }

    /** A canvas stream carrying the stage, or null when video cannot be encoded. */
    private setupVideo(): string | null {
        if (typeof document === 'undefined' || !('captureStream' in HTMLCanvasElement.prototype)) {
            return null;
        }

        const mimeType = pickSupported(VIDEO_TYPES);

        if (mimeType === null) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        this.canvas = canvas;

        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.style.cssText =
            'position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:0;pointer-events:none';
        document.body.appendChild(video);
        this.video = video;

        try {
            this.canvasStream = canvas.captureStream(FRAME_RATE);
        } catch {
            video.remove();
            this.video = null;
            this.canvas = null;

            return null;
        }

        this.draw();

        const loop = (): void => {
            this.draw();
            this.frameTimer = window.requestAnimationFrame(loop);
        };

        this.frameTimer = window.requestAnimationFrame(loop);

        return mimeType;
    }

    private draw(): void {
        const canvas = this.canvas;
        const context = canvas?.getContext('2d');

        if (canvas === null || context === null || context === undefined) {
            return;
        }

        const share = this.source.share();

        if (share !== null && share.readyState === 'live') {
            this.bindShare(share);
            context.fillStyle = STAGE;
            context.fillRect(0, 0, canvas.width, canvas.height);

            const video = this.video;

            if (video !== null && video.videoWidth > 0 && video.videoHeight > 0) {
                const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
                const width = video.videoWidth * scale;
                const height = video.videoHeight * scale;

                context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
            }

            return;
        }

        this.unbindShare();
        this.drawSlate(context, canvas);
    }

    private drawSlate(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        const elapsed = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);

        if (elapsed === this.slateSecond) {
            return;
        }

        this.slateSecond = elapsed;

        context.fillStyle = STAGE;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // The board's dot grid, at rest: this video is mostly here to carry the
        // audio, but a wall of black is not something to open later.
        context.fillStyle = 'rgba(255,255,255,0.045)';

        for (let y = 28; y < canvas.height; y += 32) {
            for (let x = 28; x < canvas.width; x += 32) {
                context.beginPath();
                context.arc(x, y, 1, 0, Math.PI * 2);
                context.fill();
            }
        }

        context.textBaseline = 'middle';
        context.textAlign = 'left';

        context.fillStyle = '#f06a5e';
        context.beginPath();
        context.arc(44, 44, 6, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = 'rgba(255,255,255,0.62)';
        context.font = '600 15px "IBM Plex Mono", ui-monospace, monospace';
        context.fillText(`REC  ${formatClock(elapsed)}`, 60, 44);

        context.textAlign = 'right';
        context.fillStyle = 'rgba(255,255,255,0.32)';
        context.font = '500 13px "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif';
        context.fillText('SAVED ON THIS DEVICE', canvas.width - 44, 44);

        context.textAlign = 'center';
        context.fillStyle = '#f4f6fb';
        context.font = '600 48px "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif';

        const lines = wrapText(context, this.source.title, canvas.width - 260, 2);
        const lineHeight = 60;
        const titleTop = canvas.height / 2 - 40 - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, titleTop + index * lineHeight);
        });

        context.fillStyle = 'rgba(255,255,255,0.46)';
        context.font = '400 18px "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif';
        context.fillText(
            'Audio recording · the file downloads when you stop',
            canvas.width / 2,
            canvas.height / 2 + 56,
        );
    }

    private bindShare(track: MediaStreamTrack): void {
        const video = this.video;

        if (video === null || this.boundShare === track) {
            return;
        }

        this.boundShare = track;
        video.srcObject = new MediaStream([track]);
        void video.play().catch(() => {});
    }

    private unbindShare(): void {
        const video = this.video;

        this.boundShare = null;

        if (video !== null && video.srcObject !== null) {
            video.srcObject = null;
        }
    }

    /** Tear down the canvas half only, leaving the audio mix running. */
    private discardVideo(): void {
        if (this.frameTimer !== null) {
            window.cancelAnimationFrame(this.frameTimer);
            this.frameTimer = null;
        }

        this.canvasStream?.getTracks().forEach((track) => track.stop());
        this.canvasStream = null;

        this.unbindShare();
        this.video?.remove();
        this.video = null;
        this.canvas = null;
    }

    private cleanup(): void {
        this.discardVideo();

        if (this.syncTimer !== null) {
            window.clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        for (const node of this.sources.values()) {
            node.disconnect();
        }

        this.sources.clear();

        this.destination?.stream.getTracks().forEach((track) => track.stop());
        this.destination = null;

        if (this.audioContext !== null) {
            void this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        this.recorder = null;
    }
}
