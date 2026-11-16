import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  Mic,
  MonitorSpeaker,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import {
  getFrame,
  getProgress,
  next,
  previous,
  seek,
  setVolume,
  startMicrophone,
  startSystemAudio,
  stop,
  systemAudioSupported,
  togglePlay,
  useAudio,
} from "@/audio/engine";
import { pickFiles } from "@/audio/pickFiles";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function IconButton({
  label,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active && "bg-white/10 text-primary",
        className,
      )}
      {...props}
    />
  );
}

/** Live input meter for mic / device capture. */
function LevelMeter() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (bar.current) {
        bar.current.style.transform = `scaleX(${Math.min(1, getFrame().level * 1.6)})`;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div ref={bar} className="h-full origin-left bg-primary" />
    </div>
  );
}

export default function Transport() {
  const { source, queue, index, playing, volume } = useAudio();
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    if (source !== "file") return;
    const id = window.setInterval(() => setProgress(getProgress()), 250);
    return () => window.clearInterval(id);
  }, [source]);

  if (source === "none") return null;
  const track = queue[index];

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-5">
      {/* What's playing */}
      <div className="min-w-0 sm:w-52">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {source === "file"
            ? `Track ${index + 1} of ${queue.length}`
            : source === "mic"
              ? "Listening: microphone"
              : "Listening: this device"}
        </p>
        <p className="truncate text-sm font-bold text-white">
          {source === "file"
            ? track?.title
            : source === "mic"
              ? "Room audio"
              : "Shared audio"}
        </p>
        {source === "file" && track?.artist && (
          <p className="truncate text-xs text-zinc-400">{track.artist}</p>
        )}
      </div>

      {/* Playback or live meter */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {source === "file" ? (
          <>
            <IconButton label="Previous track" onClick={previous}>
              <SkipBack className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              className="bg-white text-black hover:bg-primary hover:text-black"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </IconButton>
            <IconButton label="Next track" onClick={() => next()}>
              <SkipForward className="h-4 w-4" />
            </IconButton>
            <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-400">
              {formatTime(progress.current)}
            </span>
            <Slider
              aria-label="Seek"
              className="min-w-0 flex-1"
              min={0}
              max={1000}
              value={[
                progress.duration ? (progress.current / progress.duration) * 1000 : 0,
              ]}
              onValueChange={([v]) => {
                seek(v / 1000);
                setProgress((p) => ({ ...p, current: (v / 1000) * p.duration }));
              }}
            />
            <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">
              {formatTime(progress.duration)}
            </span>
          </>
        ) : (
          <LevelMeter />
        )}
      </div>

      {/* Volume and source switching */}
      <div className="flex items-center gap-1">
        {source === "file" && (
          <div className="mr-2 hidden items-center gap-2 md:flex">
            <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" />
            <Slider
              aria-label="Volume"
              className="w-20"
              min={0}
              max={100}
              value={[volume * 100]}
              onValueChange={([v]) => setVolume(v / 100)}
            />
          </div>
        )}
        {systemAudioSupported() && (
          <IconButton
            label="Listen to this device"
            active={source === "system"}
            onClick={startSystemAudio}
          >
            <MonitorSpeaker className="h-4 w-4" />
          </IconButton>
        )}
        <IconButton
          label="Use the microphone"
          active={source === "mic"}
          onClick={startMicrophone}
        >
          <Mic className="h-4 w-4" />
        </IconButton>
        <IconButton label="Open audio files" onClick={pickFiles}>
          <FolderOpen className="h-4 w-4" />
        </IconButton>
        <IconButton label="Stop and choose another source" onClick={stop}>
          <Square className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
