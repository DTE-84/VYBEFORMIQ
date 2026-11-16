import { Disc3, Maximize, Minimize, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODES, useSettings } from "@/store/settings";

function BarButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-300 backdrop-blur-xl transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active && "border-primary/70 text-primary",
      )}
    >
      {children}
    </button>
  );
}

export default function TopBar({
  controlsOpen,
  creatorOpen,
  fullscreen,
  onToggleControls,
  onToggleCreator,
  onToggleFullscreen,
}: {
  controlsOpen: boolean;
  creatorOpen: boolean;
  fullscreen: boolean;
  onToggleControls: () => void;
  onToggleCreator: () => void;
  onToggleFullscreen: () => void;
}) {
  const mode = useSettings((s) => s.mode);
  const set = useSettings((s) => s.set);

  return (
    <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
          VYBEFORMIQ
        </span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">
          Sound. Reimagined.
        </span>
      </div>

      <div className="flex items-center gap-2 sm:order-3">
        <BarButton label="Creator Studio" active={creatorOpen} onClick={onToggleCreator}>
          <Disc3 className="h-4 w-4" />
        </BarButton>
        <BarButton label="Controls" active={controlsOpen} onClick={onToggleControls}>
          <SlidersHorizontal className="h-4 w-4" />
        </BarButton>
        <BarButton
          label={fullscreen ? "Exit full screen" : "Full screen"}
          onClick={onToggleFullscreen}
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </BarButton>
      </div>

      <nav
        aria-label="Visual mode"
        className="order-last flex w-full gap-1 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-white/10 bg-black/50 p-1 backdrop-blur-xl sm:order-2 sm:w-auto"
      >
        {MODES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => set({ mode: m.id })}
            aria-pressed={mode === m.id}
            title={`${m.blurb} (${i + 1})`}
            className={cn(
              "flex-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider sm:px-4 sm:text-xs sm:tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none",
              mode === m.id
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {m.name}
          </button>
        ))}
      </nav>
    </header>
  );
}
