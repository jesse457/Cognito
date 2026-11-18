import { ArrowsOut, Pause, PictureInPicture, Play, SpeakerHigh, SpeakerX } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

function timeLabel(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }

    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const rest = String(whole % 60).padStart(2, '0');

    return `${minutes}:${rest}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
    src,
    title,
    poster,
}: {
    src: string;
    title: string;
    poster?: string;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const shell = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        setPlaying(false);
        setCurrent(0);
        setDuration(0);
        setBuffered(0);
    }, [src]);

    useEffect(() => {
        function onChange(): void {
            setFullscreen(document.fullscreenElement === shell.current);
        }

        document.addEventListener('fullscreenchange', onChange);

        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggle = useCallback((): void => {
        const element = video.current;

        if (element === null) {
            return;
        }

        if (element.paused) {
            void element.play().catch(() => setPlaying(false));
        } else {
            element.pause();
        }
    }, []);

    const seek = useCallback((value: number): void => {
        const element = video.current;

        if (element === null || !Number.isFinite(element.duration)) {
            return;
        }

        element.currentTime = Math.min(Math.max(value, 0), element.duration);
        setCurrent(element.currentTime);
    }, []);

    function trackBuffered(): void {
        const element = video.current;

        if (element === null || element.buffered.length === 0 || !Number.isFinite(element.duration)) {
            return;
        }

        setBuffered(element.buffered.end(element.buffered.length - 1));
    }

    function changeVolume(value: number): void {
        const element = video.current;

        setVolume(value);
        setMuted(value === 0);

        if (element !== null) {
            element.volume = value;
            element.muted = value === 0;
        }
    }

    function toggleMute(): void {
        const element = video.current;

        setMuted((value) => {
            if (element !== null) {
                element.muted = ! value;
            }

            return ! value;
        });
    }

    function changeSpeed(value: number): void {
        setSpeed(value);

        if (video.current !== null) {
            video.current.playbackRate = value;
        }
    }

    function toggleFullscreen(): void {
        if (document.fullscreenElement === shell.current) {
            void document.exitFullscreen();
        } else {
            void shell.current?.requestFullscreen?.();
        }
    }

    function togglePictureInPicture(): void {
        const element = video.current;

        if (element === null || document.pictureInPictureElement === element) {
            void document.exitPictureInPicture?.();
        } else {
            void element.requestPictureInPicture?.().catch(() => undefined);
        }
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (event.key === ' ' || event.key === 'k') {
            event.preventDefault();
            toggle();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            seek(current - 5);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            seek(current + 5);
        } else if (event.key === 'm') {
            toggleMute();
        } else if (event.key === 'f') {
            toggleFullscreen();
        }
    }

    const percent = duration > 0 ? (current / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={shell}
            className="group relative overflow-hidden rounded-xl bg-black shadow-stage"
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="group"
            aria-label={`Video player: ${title}`}
        >
            <video
                ref={video}
                src={src}
                poster={poster}
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black object-contain"
                onClick={toggle}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                onDurationChange={(event) => setDuration(event.currentTarget.duration)}
                onProgress={trackBuffered}
                onLoadedMetadata={trackBuffered}
                aria-label={title}
            >
                Your browser cannot play this video.
            </video>

            {!playing ? (
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={`Play ${title}`}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/10"
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
                        <Play size={24} weight="fill" aria-hidden="true" />
                    </span>
                </button>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pt-8 pb-2.5 text-white">
                <div className="relative h-3.5 flex items-center">
                    <div className="absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/25">
                        <div className="h-full bg-white/35" style={{ width: `${bufferedPercent}%` }} />
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={current}
                        onChange={(event) => seek(Number(event.target.value))}
                        aria-label="Seek"
                        className="relative h-3.5 w-full cursor-pointer appearance-none bg-transparent accent-white"
                        style={{ background: `linear-gradient(to right, white ${percent}%, transparent ${percent}%)` }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={playing ? 'Pause' : 'Play'}
                        className="rounded p-1 hover:bg-white/15"
                    >
                        {playing ? <Pause size={17} weight="fill" aria-hidden="true" /> : <Play size={17} weight="fill" aria-hidden="true" />}
                    </button>

                    <span className="text-[11px] tabular-nums text-white/85">
                        {timeLabel(current)} / {timeLabel(duration)}
                    </span>

                    <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={muted ? 'Unmute' : 'Mute'}
                        className="ml-1 rounded p-1 hover:bg-white/15"
                    >
                        {muted || volume === 0
                            ? <SpeakerX size={17} aria-hidden="true" />
                            : <SpeakerHigh size={17} aria-hidden="true" />}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={(event) => changeVolume(Number(event.target.value))}
                        aria-label="Volume"
                        className="hidden h-1 w-16 cursor-pointer accent-white sm:block"
                    />

                    <select
                        value={speed}
                        onChange={(event) => changeSpeed(Number(event.target.value))}
                        aria-label="Playback speed"
                        className="ml-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white outline-none"
                    >
                        {SPEEDS.map((value) => (
                            <option key={value} value={value}>{value}×</option>
                        ))}
                    </select>

                    <div className="ml-auto flex items-center gap-1">
                        <button
                            type="button"
                            onClick={togglePictureInPicture}
                            aria-label="Picture in picture"
                            className="hidden rounded p-1 hover:bg-white/15 sm:block"
                        >
                            <PictureInPicture size={16} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            className="rounded p-1 hover:bg-white/15"
                        >
                            <ArrowsOut size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
