# VYBEFORMIQ

**Sound. Reimagined.**

An audio-reactive visualizer that runs in the browser. Pick a sound source,
pick a visual mode, and the whole stage moves with the bass, mids and highs.
Audio is analysed locally and never uploaded.

## Visual modes

- **Spectrum**: frequency bars with peak caps and a floor reflection.
- **Orbit**: circular spectrum and waveform, with particles thrown out on the beat.
- **Nebula**: a 3D particle cloud where each particle follows its own frequency band.
- **Tunnel**: a flight through geometric rings, driven by level and beat.
- **Ambient**: slow colour fields for a second monitor.

## Sound sources

- **This device**: share a tab or screen with audio on (Spotify, Pandora, YouTube, anything already playing). Desktop Chrome and Edge.
- **Microphone**: reacts to the room.
- **Audio files**: choose files or drop them on the page.
- **Creator Studio**: tracks that ship with the site, listed in `client/data/tracks.ts`.

## Controls

Sensitivity, bass intensity, density, five palettes plus a custom one, and
named setups saved in the browser. Keys `1`-`5` switch mode, `Space`
plays/pauses, `F` toggles full screen.

## Tech stack

- React 18 + TypeScript + Vite + TailwindCSS 3
- Canvas 2D and Three.js (React Three Fiber) for the visuals
- Web Audio API (`AnalyserNode`) for analysis
- Zustand for settings, persisted to `localStorage`

## Project structure

```text
client/
  audio/              # Audio engine: sources, analysis, beat detection
  visuals/            # The five visual modes
  components/studio/  # Top bar, source picker, transport, panels
  store/              # Settings and saved setups
  data/               # Creator Studio track list
  pages/Index.tsx     # The studio page
public/               # MP3 tracks and static assets
```

## Development

```bash
pnpm install
pnpm dev        # http://localhost:8080
pnpm build
pnpm typecheck
```

---
Design by DTE Solutions
