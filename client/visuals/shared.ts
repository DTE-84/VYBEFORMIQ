import { useEffect, useRef } from "react";
import { getFrame, type AudioFrame } from "@/audio/engine";
import { activeColors, useSettings } from "@/store/settings";

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Sample a 3-stop palette at t (0..1, wraps). */
export function samplePalette(palette: RGB[], t: number): RGB {
  const n = palette.length;
  const x = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const f = x - i;
  const a = palette[i % n];
  const b = palette[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

export const rgba = (c: RGB, alpha = 1) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size of the canvas. */
  w: number;
  h: number;
  frame: AudioFrame;
  palette: RGB[];
  density: number;
}

/**
 * A full-size 2D canvas with a render loop. `draw` is called every animation
 * frame with fresh audio analysis and the current palette.
 */
export function useCanvas2D(draw: (d: DrawContext) => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let colorKey = "";
    let palette: RGB[] = [];
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const settings = useSettings.getState();
      const colors = activeColors(settings);
      const key = colors.join();
      if (key !== colorKey) {
        colorKey = key;
        palette = colors.map(hexToRgb);
      }
      if (w && h) {
        drawRef.current({
          ctx,
          w,
          h,
          frame: getFrame(),
          palette,
          density: settings.density,
        });
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return canvasRef;
}

export const CANVAS_CLASS = "absolute inset-0 h-full w-full";
