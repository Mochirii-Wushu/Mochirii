"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type RecruitmentAudioSource = {
  src: string;
  type?: string;
};

type RecruitmentAudioPlayerProps = {
  sources: RecruitmentAudioSource[];
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RecruitmentAudioPlayer({ sources }: RecruitmentAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState("");

  const playableSources = useMemo(
    () => sources.filter((source) => source.src.trim().length > 0),
    [sources],
  );
  const primarySource = playableSources[0];
  const hasAudio = playableSources.length > 0;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumeProgress = Math.round(volume * 100);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    };
    const syncTime = () => setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    const syncPlay = () => {
      setIsPlaying(true);
      setStatus("");
    };
    const syncPause = () => setIsPlaying(false);
    const syncEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const syncVolume = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted || audio.volume === 0);
    };
    const syncError = () => {
      setIsPlaying(false);
      setStatus("Unable to load the audio note.");
    };

    audio.addEventListener("loadedmetadata", syncMetadata);
    audio.addEventListener("durationchange", syncMetadata);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("play", syncPlay);
    audio.addEventListener("pause", syncPause);
    audio.addEventListener("ended", syncEnded);
    audio.addEventListener("volumechange", syncVolume);
    audio.addEventListener("error", syncError);

    syncMetadata();
    syncVolume();

    return () => {
      audio.removeEventListener("loadedmetadata", syncMetadata);
      audio.removeEventListener("durationchange", syncMetadata);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("play", syncPlay);
      audio.removeEventListener("pause", syncPause);
      audio.removeEventListener("ended", syncEnded);
      audio.removeEventListener("volumechange", syncVolume);
      audio.removeEventListener("error", syncError);
    };
  }, [playableSources]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      if (audio.networkState === audio.NETWORK_EMPTY) {
        audio.load();
      }
      await audio.play();
    } catch {
      setStatus("Unable to start audio playback.");
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function updateVolume(value: number) {
    const nextVolume = Math.min(1, Math.max(0, value));
    const audio = audioRef.current;
    if (audio) {
      audio.volume = nextVolume;
      audio.muted = nextVolume === 0;
    }
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !(audio.muted || audio.volume === 0);
    setIsMuted(audio.muted || audio.volume === 0);
  }

  return (
    <div
      className="recruitment-audio-shell u-full-width u-mt-12"
      onContextMenu={(event) => event.preventDefault()}
    >
      <audio
        id="recruitmentAudio"
        ref={audioRef}
        src={primarySource?.src}
        preload="none"
        className="recruitment-audio-native"
        aria-labelledby="recruitmentAudioTitle"
        aria-describedby="recruitmentAudioDesc"
        controlsList="nodownload"
      >
        Your browser does not support the audio element.
      </audio>

      <div
        className="recruitment-audio-player"
        data-custom-recruitment-audio-player="true"
        data-state={isPlaying ? "playing" : "paused"}
        aria-describedby="recruitmentAudioDesc"
        style={
          {
            "--audio-progress": `${progress}%`,
            "--audio-volume": `${volumeProgress}%`,
          } as React.CSSProperties
        }
      >
        <button
          className="recruitment-audio-button recruitment-audio-button--play"
          type="button"
          onClick={togglePlayback}
          disabled={!hasAudio}
          data-audio-play
          aria-label={isPlaying ? "Pause recruitment audio" : "Play recruitment audio"}
        >
          <span className="recruitment-audio-button__icon" data-icon={isPlaying ? "pause" : "play"} aria-hidden="true" />
        </button>

        <label className="recruitment-audio-progress-wrap">
          <span className="sr-only">Seek recruitment audio</span>
          <input
            className="recruitment-audio-progress"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={duration > 0 ? currentTime : 0}
            onChange={(event) => seek(Number(event.currentTarget.value))}
            disabled={!hasAudio || duration <= 0}
            data-audio-seek
            aria-label="Seek recruitment audio"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
        </label>

        <span className="recruitment-audio-time" data-audio-time aria-live="off">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          className="recruitment-audio-button recruitment-audio-button--mute"
          type="button"
          onClick={toggleMute}
          disabled={!hasAudio}
          data-audio-mute
          aria-label={isMuted ? "Unmute recruitment audio" : "Mute recruitment audio"}
          data-muted={isMuted ? "true" : "false"}
        >
          Vol
        </button>

        <label className="recruitment-audio-volume-wrap">
          <span className="sr-only">Recruitment audio volume</span>
          <input
            className="recruitment-audio-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => updateVolume(Number(event.currentTarget.value))}
            disabled={!hasAudio}
            data-audio-volume
            aria-label="Recruitment audio volume"
            aria-valuetext={`${volumeProgress}%`}
          />
        </label>

        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
