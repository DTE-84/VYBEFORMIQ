import { Pause, Play, X } from "lucide-react";
import { playQueue, togglePlay, useAudio } from "@/audio/engine";
import { FEATURED_TRACKS } from "@/data/tracks";
import { cn } from "@/lib/utils";

/** The original purpose of the site: a home for the artist's own tracks. */
export default function CreatorStudio({ onClose }: { onClose: () => void }) {
  const { source, queue, index, playing } = useAudio();
  const currentSrc = source === "file" ? queue[index]?.src : undefined;

  return (
    <aside
      aria-label="Creator Studio"
      className="pointer-events-auto flex max-h-full w-80 max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">
          Creator Studio
        </h2>
        <button
          onClick={onClose}
          aria-label="Close Creator Studio"
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="overflow-y-auto px-3 py-3">
        <ul>
          {FEATURED_TRACKS.map((track, i) => {
            const current = track.src === currentSrc;
            return (
              <li key={track.src}>
                <button
                  onClick={() => (current ? togglePlay() : playQueue(FEATURED_TRACKS, i))}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                      current
                        ? "border-primary bg-primary text-black"
                        : "border-white/15 text-white group-hover:border-white/40",
                    )}
                  >
                    {current && playing ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-sm font-bold",
                        current ? "text-primary" : "text-white",
                      )}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-400">
                      {track.artist}
                    </span>
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="px-2 pb-2 pt-4 text-xs leading-relaxed text-zinc-500">
          Original recordings from Keys Beats. New releases will show up here.
        </p>
      </div>
    </aside>
  );
}
