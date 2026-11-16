import { useState } from "react";
import { RotateCcw, Save, Trash2, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  CUSTOM_PALETTE_ID,
  MODES,
  PALETTES,
  useSettings,
} from "@/store/settings";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Control({
  label,
  value,
  display,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-zinc-200">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">{display}</span>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={(max - min) / 100}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

const swatch = (colors: string[]) =>
  `linear-gradient(90deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;

export default function ControlPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const [presetName, setPresetName] = useState("");

  const save = () => {
    s.savePreset(presetName);
    setPresetName("");
  };

  return (
    <aside
      aria-label="Visualizer controls"
      className="pointer-events-auto flex max-h-full w-80 max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Controls</h2>
        <button
          onClick={onClose}
          aria-label="Close controls"
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-7 overflow-y-auto px-5 py-5">
        <Section title="Response">
          <Control
            label="Sensitivity"
            value={s.sensitivity}
            display={`${Math.round(s.sensitivity * 100)}%`}
            min={0.4}
            max={2.5}
            onChange={(v) => s.set({ sensitivity: v })}
          />
          <Control
            label="Bass intensity"
            value={s.bassIntensity}
            display={`${Math.round(s.bassIntensity * 100)}%`}
            min={0}
            max={2}
            onChange={(v) => s.set({ bassIntensity: v })}
          />
          <Control
            label="Density"
            value={s.density}
            display={`${Math.round(s.density * 100)}%`}
            min={0}
            max={1}
            onChange={(v) => s.set({ density: v })}
          />
        </Section>

        <Section title="Palette">
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => s.set({ paletteId: p.id })}
                aria-pressed={s.paletteId === p.id}
                className={cn(
                  "rounded-lg border p-2 text-left transition-colors",
                  s.paletteId === p.id
                    ? "border-white/70 bg-white/10"
                    : "border-white/10 hover:border-white/30",
                )}
              >
                <span
                  className="block h-3 rounded-full"
                  style={{ background: swatch(p.colors) }}
                />
                <span className="mt-1.5 block text-xs text-zinc-200">{p.name}</span>
              </button>
            ))}
            <div
              className={cn(
                "rounded-lg border p-2",
                s.paletteId === CUSTOM_PALETTE_ID
                  ? "border-white/70 bg-white/10"
                  : "border-white/10",
              )}
            >
              <div className="flex gap-1">
                {s.customColors.map((color, i) => (
                  <input
                    key={i}
                    type="color"
                    value={color}
                    aria-label={`Custom colour ${i + 1}`}
                    onChange={(e) => s.setCustomColor(i, e.target.value)}
                    className="h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                  />
                ))}
              </div>
              <button
                onClick={() => s.set({ paletteId: CUSTOM_PALETTE_ID })}
                className="mt-1.5 block text-xs text-zinc-200 hover:text-white"
              >
                Custom
              </button>
            </div>
          </div>
        </Section>

        <Section title="Saved setups">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Name this setup"
              aria-label="Setup name"
              maxLength={40}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Save setup"
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-black transition-colors hover:bg-primary"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </form>

          {s.presets.length === 0 ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Save the current mode, palette and response settings to switch
              back to them in one click.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {s.presets.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 pr-1"
                >
                  <button
                    onClick={() => s.applyPreset(p.id)}
                    className="min-w-0 flex-1 px-3 py-2 text-left"
                  >
                    <span className="block truncate text-sm text-white">{p.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      {MODES.find((m) => m.id === p.mode)?.name}
                    </span>
                  </button>
                  <button
                    onClick={() => s.deletePreset(p.id)}
                    aria-label={`Delete ${p.name}`}
                    className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <button
          onClick={s.reset}
          className="flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>
      </div>
    </aside>
  );
}
