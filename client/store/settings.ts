import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModeId = "spectrum" | "orbit" | "nebula" | "tunnel" | "ambient";

export const MODES: { id: ModeId; name: string; blurb: string }[] = [
  { id: "spectrum", name: "Spectrum", blurb: "Frequency bars" },
  { id: "orbit", name: "Orbit", blurb: "Circular waveform and particles" },
  { id: "nebula", name: "Nebula", blurb: "3D particle cloud" },
  { id: "tunnel", name: "Tunnel", blurb: "Beat-driven geometry" },
  { id: "ambient", name: "Ambient", blurb: "Slow and subtle" },
];

export interface Palette {
  id: string;
  name: string;
  colors: [string, string, string];
}

export const PALETTES: Palette[] = [
  { id: "ember", name: "Ember", colors: ["#ff5500", "#ffaa00", "#ff0055"] },
  { id: "aurora", name: "Aurora", colors: ["#00ffd0", "#2f8bff", "#ff2fd6"] },
  { id: "synthwave", name: "Synthwave", colors: ["#ff2a9d", "#8a3cff", "#27c7ff"] },
  { id: "glacier", name: "Glacier", colors: ["#7fe0ff", "#3a6bff", "#e8f6ff"] },
  { id: "mono", name: "Mono", colors: ["#ffffff", "#9a9aa5", "#55555f"] },
];

export const CUSTOM_PALETTE_ID = "custom";

/** The part of the state a saved configuration captures. */
export interface VisualConfig {
  mode: ModeId;
  paletteId: string;
  customColors: [string, string, string];
  sensitivity: number; // 0.4 – 2.5
  bassIntensity: number; // 0 – 2
  density: number; // 0 – 1
}

export interface SavedPreset extends VisualConfig {
  id: string;
  name: string;
}

interface SettingsState extends VisualConfig {
  presets: SavedPreset[];
  set: (patch: Partial<VisualConfig>) => void;
  setCustomColor: (index: number, color: string) => void;
  savePreset: (name: string) => void;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  reset: () => void;
}

const DEFAULTS: VisualConfig = {
  mode: "orbit",
  paletteId: "aurora",
  customColors: ["#ff5500", "#00ffd0", "#8a3cff"],
  sensitivity: 1,
  bassIntensity: 1,
  density: 0.5,
};

const pickConfig = (s: VisualConfig): VisualConfig => ({
  mode: s.mode,
  paletteId: s.paletteId,
  customColors: [...s.customColors] as [string, string, string],
  sensitivity: s.sensitivity,
  bassIntensity: s.bassIntensity,
  density: s.density,
});

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      presets: [],
      set: (patch) => set(patch),
      setCustomColor: (index, color) => {
        const next = [...get().customColors] as [string, string, string];
        next[index] = color;
        set({ customColors: next, paletteId: CUSTOM_PALETTE_ID });
      },
      savePreset: (name) => {
        const preset: SavedPreset = {
          ...pickConfig(get()),
          id: `${Date.now()}`,
          name: name.trim() || `Preset ${get().presets.length + 1}`,
        };
        set({ presets: [...get().presets, preset] });
      },
      applyPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) set(pickConfig(preset));
      },
      deletePreset: (id) =>
        set({ presets: get().presets.filter((p) => p.id !== id) }),
      reset: () => set(DEFAULTS),
    }),
    { name: "vybeformiq-settings", version: 1 },
  ),
);

/** Resolve the three active colors for a config. */
export function activeColors(s: {
  paletteId: string;
  customColors: [string, string, string];
}): [string, string, string] {
  if (s.paletteId === CUSTOM_PALETTE_ID) return s.customColors;
  return (PALETTES.find((p) => p.id === s.paletteId) ?? PALETTES[0]).colors;
}
