/**
 * Custom HLS.js video player: the stage `PlayerPage.tsx` renders once
 * `resolveStreams` (services/streamResolver.ts) has at least one stream for
 * the title. Replaces the cross-origin VidKing iframe with a player this
 * app actually controls, matching Netflix's own control bar.
 *
 * One `<video>` element for the component's whole life; switching quality
 * or audio track swaps what's attached to it (a new Hls instance, or a new
 * `src` on browsers with native HLS) rather than remounting, so the resume
 * position and play state survive the switch (see `attachSource` below).
 *
 * Reports every meaningful player event through `onProgress` — the same
 * shape `features/playback/vidking.ts`'s `parsePlayerEvent` already
 * produced — so `PlayerPage.tsx` saves resume position exactly as before.
 */
import Hls from 'hls.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CaptionsIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  GearIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from '../icons/Icons.tsx';
import type { StreamResult } from '../../services/streamResolver.ts';
import './VideoPlayer.css';

const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const;
/** How long an idle pointer leaves the controls up before they fade (ms). */
const CONTROLS_HIDE_DELAY_MS = 3000;

export interface VideoPlayerEvent {
  event: 'play' | 'pause' | 'ended' | 'seeked' | 'timeupdate';
  currentTimeSeconds: number;
  durationSeconds: number | null;
}

interface VideoPlayerProps {
  sources: StreamResult[];
  startAtSeconds: number;
  title: string;
  onProgress: (event: VideoPlayerEvent) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const paddedSecs = String(secs).padStart(2, '0');
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${paddedSecs}`;
  return `${mins}:${paddedSecs}`;
}

/** Quality rank, highest first, for sorting the selector and picking the default. */
const QUALITY_RANK: Record<StreamResult['quality'], number> = {
  '4K': 0,
  '1080p': 1,
  '720p': 2,
  '480p': 3,
};

export function VideoPlayer({ sources, startAtSeconds, title, onProgress }: VideoPlayerProps) {
  const orderedSources = useMemo(
    () => [...sources].sort((a, b) => QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality]),
    [sources],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startAtSeconds);
  const [duration, setDuration] = useState<number | null>(null);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(0);
  const [captionsAvailable, setCaptionsAvailable] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState<'quality' | 'speed' | null>(null);

  // Carries the resume point / play state across a quality switch, which
  // otherwise re-attaches a fresh Hls instance and loses both.
  const pendingResumeRef = useRef(startAtSeconds);
  const wasPlayingRef = useRef(false);

  const source = orderedSources[sourceIndex] ?? orderedSources[0];

  // Attaches `source` to the <video> element. Runs once per source change
  // (quality switch, or mount) — never on play/pause/volume, which just act
  // on the already-attached element directly.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    function seekAndMaybePlay() {
      if (!video) return;
      if (pendingResumeRef.current > 0) video.currentTime = pendingResumeRef.current;
      if (wasPlayingRef.current) video.play().catch(() => {});
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, seekAndMaybePlay);
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setAudioTracks(hls.audioTracks.map((track, index) => ({ id: index, name: track.name })));
        setActiveAudioTrack(hls.audioTrack);
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        setCaptionsAvailable(hls.subtitleTracks.length > 0);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) console.error('HLS playback error', data);
      });
      hls.loadSource(source.url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari plays HLS natively; no multi-audio/subtitle-track API here.
      video.src = source.url;
      video.addEventListener('loadedmetadata', seekAndMaybePlay, { once: true });
    } else {
      console.error('This browser can play neither hls.js nor native HLS.');
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // source.url is the only thing that should re-attach the player.
  }, [source?.url]); // oxlint-disable-line react-hooks/exhaustive-deps

  // Native <video> element events drive playback state directly, so the UI
  // reflects what the element is actually doing (e.g. autoplay being
  // blocked), not just what a button was clicked to request.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function emit(event: VideoPlayerEvent['event']) {
      if (!video) return;
      onProgress({
        event,
        currentTimeSeconds: video.currentTime,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      });
    }
    const onPlay = () => {
      setPlaying(true);
      emit('play');
    };
    const onPause = () => {
      setPlaying(false);
      emit('pause');
    };
    const onEnded = () => {
      setPlaying(false);
      emit('ended');
    };
    const onSeeked = () => emit('seeked');
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const ranges = video.buffered;
      if (ranges.length > 0) setBufferedEnd(ranges.end(ranges.length - 1));
      emit('timeupdate');
    };
    const onDurationChange = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : null);
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
    };
    // onProgress's identity isn't worth resubscribing every element listener over.
  }, []); // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible((visible) => (playing ? false : visible));
    }, CONTROLS_HIDE_DELAY_MS);
  }, [playing]);
  useEffect(() => {
    showControls();
    return () => clearTimeout(hideTimerRef.current);
  }, [showControls]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  function changeVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
  }

  function changeSpeed(value: number) {
    const video = videoRef.current;
    if (video) video.playbackRate = value;
    setSpeed(value);
    setMenuOpen(null);
  }

  function changeQuality(index: number) {
    const video = videoRef.current;
    if (video) {
      pendingResumeRef.current = video.currentTime;
      wasPlayingRef.current = !video.paused;
    }
    setSourceIndex(index);
    setMenuOpen(null);
  }

  function changeAudioTrack(id: number) {
    if (hlsRef.current) hlsRef.current.audioTrack = id;
    setActiveAudioTrack(id);
  }

  function toggleCaptions() {
    if (!hlsRef.current) return;
    const next = !captionsOn;
    hlsRef.current.subtitleTrack = next ? 0 : -1;
    setCaptionsOn(next);
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void container.requestFullscreen();
  }

  if (!source) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`vp${controlsVisible ? '' : ' vp--controls-hidden'}`}
      onMouseMove={showControls}
      onTouchStart={showControls}
      onClick={(event) => {
        // Only taps on the stage itself toggle play; clicks on the control bar handle themselves.
        if (event.target === videoRef.current) togglePlay();
      }}
    >
      {/* Captions come from HLS subtitle tracks (toggled below), not a static <track>. */}
      <video ref={videoRef} className="vp__video" playsInline aria-label={title} />

      <div className="vp__controls" onClick={(event) => event.stopPropagation()}>
        <div className="vp__seek-row">
          <span className="vp__time">{formatTime(currentTime)}</span>
          <div className="vp__seek-track">
            <div className="vp__seek-buffered" style={{ width: `${bufferedPercent}%` }} />
            <div className="vp__seek-progress" style={{ width: `${progressPercent}%` }} />
            <input
              type="range"
              className="vp__seek-input"
              min={0}
              max={duration ?? 0}
              step={1}
              value={currentTime}
              aria-label="Seek"
              onChange={(event) => seekTo(Number(event.target.value))}
            />
          </div>
          <span className="vp__time">{duration ? formatTime(duration) : '--:--'}</span>
        </div>

        <div className="vp__buttons-row">
          <div className="vp__buttons-group">
            <button
              type="button"
              className="vp__button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={togglePlay}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="vp__volume">
              <button
                type="button"
                className="vp__button"
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                onClick={toggleMute}
              >
                {muted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
              </button>
              <input
                type="range"
                className="vp__volume-input"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(event) => changeVolume(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="vp__buttons-group">
            {captionsAvailable && (
              <button
                type="button"
                className={`vp__button${captionsOn ? ' vp__button--active' : ''}`}
                aria-pressed={captionsOn}
                aria-label="Toggle captions"
                onClick={toggleCaptions}
              >
                <CaptionsIcon />
              </button>
            )}

            {audioTracks.length > 1 && (
              <AudioMenu
                tracks={audioTracks}
                active={activeAudioTrack}
                onSelect={changeAudioTrack}
              />
            )}

            <div
              className="vp__menu-anchor"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(null);
              }}
            >
              <button
                type="button"
                className="vp__button"
                aria-haspopup="true"
                aria-expanded={menuOpen !== null}
                aria-label="Playback settings"
                onClick={() => setMenuOpen((open) => (open ? null : 'speed'))}
              >
                <GearIcon />
              </button>
              {menuOpen && (
                <SettingsMenu
                  mode={menuOpen}
                  setMode={setMenuOpen}
                  speed={speed}
                  onChangeSpeed={changeSpeed}
                  sources={orderedSources}
                  sourceIndex={sourceIndex}
                  onChangeQuality={changeQuality}
                  onClose={() => setMenuOpen(null)}
                />
              )}
            </div>

            <button
              type="button"
              className="vp__button"
              aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioMenu({
  tracks,
  active,
  onSelect,
}: {
  tracks: { id: number; name: string }[];
  active: number;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="vp__menu-anchor"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="vp__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Audio track"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="vp__audio-label">Audio</span>
      </button>
      {open && (
        <ul className="vp__menu" role="menu">
          {tracks.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={track.id === active}
                className={`vp__menu-item${track.id === active ? ' vp__menu-item--active' : ''}`}
                onClick={() => {
                  onSelect(track.id);
                  setOpen(false);
                }}
              >
                {track.name || `Track ${track.id + 1}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsMenu({
  mode,
  setMode,
  speed,
  onChangeSpeed,
  sources,
  sourceIndex,
  onChangeQuality,
  onClose,
}: {
  mode: 'quality' | 'speed';
  setMode: (mode: 'quality' | 'speed') => void;
  speed: number;
  onChangeSpeed: (value: number) => void;
  sources: StreamResult[];
  sourceIndex: number;
  onChangeQuality: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="vp__menu vp__menu--settings" role="menu">
      <div className="vp__menu-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'speed'}
          className={`vp__menu-tab${mode === 'speed' ? ' vp__menu-tab--active' : ''}`}
          onClick={() => setMode('speed')}
        >
          Speed
        </button>
        {sources.length > 1 && (
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quality'}
            className={`vp__menu-tab${mode === 'quality' ? ' vp__menu-tab--active' : ''}`}
            onClick={() => setMode('quality')}
          >
            Quality
          </button>
        )}
      </div>

      {mode === 'speed' && (
        <ul>
          {PLAYBACK_SPEEDS.map((value) => (
            <li key={value}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value === speed}
                className={`vp__menu-item${value === speed ? ' vp__menu-item--active' : ''}`}
                onClick={() => onChangeSpeed(value)}
              >
                {value === 1 ? 'Normal' : `${value}x`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === 'quality' && (
        <ul>
          {sources.map((option, index) => (
            <li key={`${option.url}-${option.quality}-${index}`}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={index === sourceIndex}
                className={`vp__menu-item${index === sourceIndex ? ' vp__menu-item--active' : ''}`}
                onClick={() => {
                  onChangeQuality(index);
                  onClose();
                }}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
