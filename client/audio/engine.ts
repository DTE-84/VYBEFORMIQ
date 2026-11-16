import { create } from "zustand";
import type { Track } from "@/data/tracks";
import { useSettings } from "@/store/settings";

export type SourceKind = "none" | "file" | "mic" | "system";

interface AudioState {
  source: SourceKind;
  queue: Track[];
  index: number;
  playing: boolean;
  volume: number;
  error: string | null;
}

export const useAudio = create<AudioState>(() => ({
  source: "none",
  queue: [],
  index: 0,
  playing: false,
  volume: 0.9,
  error: null,
}));

export const BAND_COUNT = 64;
const FFT_SIZE = 2048;

export interface AudioFrame {
  /** Log-spaced spectrum, 0..1, low to high. */
  bands: Float32Array;
  /** Time-domain samples, 0..255 centred on 128. */
  wave: Uint8Array<ArrayBuffer>;
  bass: number;
  mid: number;
  treble: number;
  level: number;
  /** Jumps to 1 on a detected beat, then decays. */
  beat: number;
  /** Seconds since page load. */
  time: number;
  dt: number;
  /** True when nothing is playing and the values are synthesized. */
  idle: boolean;
}

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let gain: GainNode | null = null;
let audioEl: HTMLAudioElement | null = null;
let streamNode: MediaStreamAudioSourceNode | null = null;
let stream: MediaStream | null = null;
let bandEdges: Uint16Array | null = null;
const objectUrls = new Set<string>();

const freqData = new Uint8Array(FFT_SIZE / 2);
const frame: AudioFrame = {
  bands: new Float32Array(BAND_COUNT),
  wave: new Uint8Array(FFT_SIZE).fill(128),
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  beat: 0,
  time: 0,
  dt: 0,
  idle: true,
};

let lastFrameAt = 0;
let bassAvg = 0;
let lastBeatAt = 0;
let runningPeak = 0.3;

function ensureGraph() {
  if (ctx) return;
  const Ctor: typeof AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  ctx = new Ctor();
  analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.78;

  // Files are heard through the gain node. Captured streams are analysed
  // only, never played back, so the mic can't feed back on itself.
  gain = ctx.createGain();
  gain.gain.value = useAudio.getState().volume;
  gain.connect(ctx.destination);

  audioEl = new Audio();
  audioEl.crossOrigin = "anonymous";
  audioEl.preload = "auto";
  const elSource = ctx.createMediaElementSource(audioEl);
  elSource.connect(analyser);
  elSource.connect(gain);

  audioEl.addEventListener("play", () => useAudio.setState({ playing: true }));
  audioEl.addEventListener("pause", () => useAudio.setState({ playing: false }));
  audioEl.addEventListener("ended", () => next(true));
  audioEl.addEventListener("error", () => {
    if (useAudio.getState().source === "file") {
      useAudio.setState({ error: "That file couldn't be played.", playing: false });
    }
  });

  // Log-spaced band edges from 30 Hz to 16 kHz.
  const binHz = ctx.sampleRate / FFT_SIZE;
  bandEdges = new Uint16Array(BAND_COUNT + 1);
  for (let i = 0; i <= BAND_COUNT; i++) {
    const hz = 30 * Math.pow(16000 / 30, i / BAND_COUNT);
    bandEdges[i] = Math.min(freqData.length - 1, Math.max(1, Math.round(hz / binHz)));
  }
}

async function resume() {
  ensureGraph();
  if (ctx!.state === "suspended") await ctx!.resume();
}

function stopStream() {
  streamNode?.disconnect();
  streamNode = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

function attachStream(next: MediaStream, kind: SourceKind) {
  audioEl?.pause();
  stopStream();
  stream = next;
  streamNode = ctx!.createMediaStreamSource(next);
  streamNode.connect(analyser!);
  runningPeak = 0.3;
  // If the user ends the share from the browser's own UI, fall back cleanly.
  next.getTracks().forEach((t) =>
    t.addEventListener("ended", () => {
      if (stream === next) stop();
    }),
  );
  useAudio.setState({ source: kind, playing: true, error: null });
}

function loadCurrent(autoplay: boolean) {
  const { queue, index } = useAudio.getState();
  const track = queue[index];
  if (!track || !audioEl) return;
  audioEl.src = track.src;
  if (autoplay) {
    audioEl.play().catch(() => useAudio.setState({ playing: false }));
  }
}

/** Play a list of tracks (featured or uploaded), starting at `index`. */
export async function playQueue(queue: Track[], index = 0) {
  if (!queue.length) return;
  await resume();
  stopStream();
  useAudio.setState({ source: "file", queue, index, error: null });
  loadCurrent(true);
}

/** Turn dropped or picked files into a queue and play it. */
export async function playFiles(files: FileList | File[]) {
  const audioFiles = Array.from(files).filter(
    (f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name),
  );
  if (!audioFiles.length) {
    useAudio.setState({ error: "No audio files found in that selection." });
    return;
  }
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls.clear();
  const queue = audioFiles.map((f) => {
    const src = URL.createObjectURL(f);
    objectUrls.add(src);
    return { title: f.name.replace(/\.[^.]+$/, ""), src };
  });
  await playQueue(queue, 0);
}

export async function startMicrophone() {
  try {
    await resume();
    const s = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    attachStream(s, "mic");
  } catch {
    useAudio.setState({
      error: "Microphone access was blocked. Allow it in the browser and try again.",
    });
  }
}

export const systemAudioSupported = () =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  "getDisplayMedia" in navigator.mediaDevices;

export async function startSystemAudio() {
  try {
    await resume();
    // Browsers only hand over audio alongside a (here unused) video track.
    const s = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      systemAudio: "include",
    } as DisplayMediaStreamOptions);
    if (!s.getAudioTracks().length) {
      s.getTracks().forEach((t) => t.stop());
      useAudio.setState({
        error:
          "No audio came through. Pick a tab or screen and turn on the share-audio switch.",
      });
      return;
    }
    attachStream(s, "system");
  } catch {
    // Dismissing the picker lands here too, so stay quiet unless nothing is playing.
    if (useAudio.getState().source === "none") {
      useAudio.setState({ error: "Audio sharing was cancelled." });
    }
  }
}

export async function togglePlay() {
  if (useAudio.getState().source !== "file" || !audioEl) return;
  await resume();
  if (audioEl.paused) audioEl.play().catch(() => {});
  else audioEl.pause();
}

export function next(fromEnded = false) {
  const { queue, index, source } = useAudio.getState();
  if (source !== "file" || !queue.length) return;
  if (fromEnded && queue.length === 1) {
    useAudio.setState({ playing: false });
    return;
  }
  useAudio.setState({ index: (index + 1) % queue.length });
  loadCurrent(true);
}

export function previous() {
  const { queue, index, source } = useAudio.getState();
  if (source !== "file" || !queue.length || !audioEl) return;
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  useAudio.setState({ index: (index - 1 + queue.length) % queue.length });
  loadCurrent(true);
}

export function seek(fraction: number) {
  if (audioEl && isFinite(audioEl.duration)) {
    audioEl.currentTime = fraction * audioEl.duration;
  }
}

export function getProgress() {
  if (!audioEl || !isFinite(audioEl.duration)) return { current: 0, duration: 0 };
  return { current: audioEl.currentTime, duration: audioEl.duration };
}

export function setVolume(volume: number) {
  useAudio.setState({ volume });
  if (gain) gain.gain.value = volume;
}

/** Stop everything and return to the source picker. */
export function stop() {
  audioEl?.pause();
  stopStream();
  useAudio.setState({ source: "none", playing: false, queue: [], index: 0 });
}

export const clearError = () => useAudio.setState({ error: null });

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Analysis for the current animation frame. Cheap to call more than once per
 * frame: the work only happens when time has moved on.
 */
export function getFrame(): AudioFrame {
  const now = performance.now();
  if (now - lastFrameAt < 4) return frame;
  const dt = Math.min(0.1, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  frame.time = now / 1000;
  frame.dt = dt;

  const { source, playing } = useAudio.getState();
  const { sensitivity, bassIntensity } = useSettings.getState();
  const live = !!analyser && source !== "none" && (source !== "file" || playing);

  if (!live) {
    // Gentle synthetic motion so the stage is never dead.
    const t = frame.time;
    for (let i = 0; i < BAND_COUNT; i++) {
      const target =
        0.1 + 0.07 * Math.sin(t * 0.9 + i * 0.31) + 0.04 * Math.sin(t * 1.7 - i * 0.13);
      frame.bands[i] += (target - frame.bands[i]) * 0.08;
    }
    for (let i = 0; i < frame.wave.length; i++) {
      frame.wave[i] = 128 + 10 * Math.sin(i * 0.02 + t * 2) * Math.sin(t * 0.6);
    }
    const breathe = 0.14 + 0.08 * Math.sin(t * 1.1);
    frame.bass += (breathe - frame.bass) * 0.08;
    frame.mid += (0.1 - frame.mid) * 0.08;
    frame.treble += (0.08 - frame.treble) * 0.08;
    frame.level += (0.1 - frame.level) * 0.08;
    frame.beat *= Math.exp(-dt * 6);
    frame.idle = true;
    return frame;
  }

  analyser!.getByteFrequencyData(freqData);
  analyser!.getByteTimeDomainData(frame.wave);

  // Captured audio (especially a mic) arrives much quieter than a file, so
  // level it against its own recent peak.
  let autoGain = 1;
  if (source !== "file") {
    let peak = 0;
    for (let i = 2; i < 400; i++) if (freqData[i] > peak) peak = freqData[i];
    runningPeak = Math.max(runningPeak * (1 - dt * 0.25), peak / 255, 0.12);
    autoGain = Math.min(4, 0.85 / runningPeak);
  }
  const scale = (sensitivity * autoGain) / 255;

  let bass = 0;
  let mid = 0;
  let treble = 0;
  for (let b = 0; b < BAND_COUNT; b++) {
    const lo = bandEdges![b];
    const hi = Math.max(lo + 1, bandEdges![b + 1]);
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += freqData[i];
    // Tilt upward with frequency: highs carry far less energy than lows.
    const tilt = 0.75 + (b / BAND_COUNT) * 0.9;
    const v = clamp01((sum / (hi - lo)) * scale * tilt);
    frame.bands[b] = v;
    if (b < 12) bass += v;
    else if (b < 40) mid += v;
    else treble += v;
  }
  bass /= 12;
  mid /= 28;
  treble /= 24;

  // Beat: bass energy jumping clear of its own recent average.
  bassAvg += (bass - bassAvg) * Math.min(1, dt * 3);
  if (bass > bassAvg * 1.3 && bass > 0.2 && now - lastBeatAt > 170) {
    frame.beat = 1;
    lastBeatAt = now;
  } else {
    frame.beat *= Math.exp(-dt * 6);
  }

  frame.bass = clamp01(bass * bassIntensity);
  frame.mid = mid;
  frame.treble = treble;
  frame.level = clamp01(bass * 0.45 + mid * 0.4 + treble * 0.15);
  frame.idle = false;
  return frame;
}
