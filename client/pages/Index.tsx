import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { clearError, playFiles, togglePlay, useAudio } from "@/audio/engine";
import ControlPanel from "@/components/studio/ControlPanel";
import CreatorStudio from "@/components/studio/CreatorStudio";
import SourcePicker from "@/components/studio/SourcePicker";
import Stage from "@/components/studio/Stage";
import TopBar from "@/components/studio/TopBar";
import Transport from "@/components/studio/Transport";
import { cn } from "@/lib/utils";
import { activeColors, MODES, useSettings } from "@/store/settings";

const IDLE_HIDE_MS = 3500;

/** "#rrggbb" to the "h s% l%" triplet the Tailwind theme variables expect. */
function hexToHslTriplet(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  // Keep the accent bright enough to read on black.
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(Math.max(l, 0.55) * 100)}%`;
}

export default function Index() {
  const source = useAudio((s) => s.source);
  const error = useAudio((s) => s.error);
  const accent = useSettings((s) => activeColors(s)[0]);

  const [controlsOpen, setControlsOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const idleTimer = useRef(0);

  // The interface accent follows the active palette.
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", hexToHslTriplet(accent));
  }, [accent]);

  // Fade the interface out while music plays and the pointer is still.
  const canAutoHide = source !== "none" && !controlsOpen && !creatorOpen;
  const wake = useCallback(() => {
    setUiHidden(false);
    window.clearTimeout(idleTimer.current);
    if (canAutoHide) {
      idleTimer.current = window.setTimeout(() => setUiHidden(true), IDLE_HIDE_MS);
    }
  }, [canAutoHide]);

  useEffect(() => {
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(idleTimer.current);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [wake]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keyboard: 1-5 switch mode, space plays/pauses, F toggles full screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [role='slider']")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const number = Number(e.key);
      if (number >= 1 && number <= MODES.length) {
        useSettings.getState().set({ mode: MODES[number - 1].id });
      } else if (e.key === " " && !target.closest("button")) {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  return (
    <main
      className={cn(
        "relative h-[100dvh] w-full select-none overflow-hidden bg-black text-white",
        uiHidden && "cursor-none",
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) playFiles(e.dataTransfer.files);
      }}
    >
      <Stage />

      {source === "none" && <SourcePicker />}

      {/* Interface layer */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-30 flex flex-col gap-3 p-3 transition-opacity duration-500 sm:p-5",
          uiHidden && "opacity-0 [&_*]:!pointer-events-none",
        )}
      >
        <TopBar
          controlsOpen={controlsOpen}
          creatorOpen={creatorOpen}
          fullscreen={fullscreen}
          onToggleControls={() => {
            setControlsOpen((v) => !v);
            setCreatorOpen(false);
          }}
          onToggleCreator={() => {
            setCreatorOpen((v) => !v);
            setControlsOpen(false);
          }}
          onToggleFullscreen={toggleFullscreen}
        />

        <div className="flex min-h-0 flex-1 items-start justify-end">
          {controlsOpen && <ControlPanel onClose={() => setControlsOpen(false)} />}
          {creatorOpen && <CreatorStudio onClose={() => setCreatorOpen(false)} />}
        </div>

        {error && (
          <div
            role="alert"
            className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-xl border border-red-400/40 bg-red-950/80 px-4 py-2.5 text-sm text-red-100 backdrop-blur-xl"
          >
            <span>{error}</span>
            <button
              onClick={clearError}
              aria-label="Dismiss"
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Transport />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-primary bg-black/70 text-lg font-bold text-white backdrop-blur-sm">
          Drop audio files to play them
        </div>
      )}
    </main>
  );
}
