import { useRef } from "react";
import { BAND_COUNT } from "@/audio/engine";
import { CANVAS_CLASS, rgba, samplePalette, useCanvas2D } from "./shared";

/** Classic frequency bars with falling peak caps and a floor reflection. */
export default function Spectrum() {
  const peaks = useRef<Float32Array>(new Float32Array(160));

  const canvasRef = useCanvas2D(({ ctx, w, h, frame, palette, density }) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Soft floor glow that swells with the bass.
    const floorY = h * 0.68;
    const glow = ctx.createRadialGradient(w / 2, floorY, 0, w / 2, floorY, w * 0.6);
    glow.addColorStop(0, rgba(palette[0], 0.1 + frame.bass * 0.22));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const bars = Math.round(28 + density * 100);
    const margin = Math.max(16, w * 0.05);
    const slot = (w - margin * 2) / bars;
    const barW = Math.max(1.5, slot * 0.68);
    const maxH = floorY - h * 0.14;

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < bars; i++) {
      // Interpolate between analysis bands so any bar count reads smoothly.
      const pos = (i / (bars - 1)) * (BAND_COUNT - 1);
      const lo = Math.floor(pos);
      const hi = Math.min(BAND_COUNT - 1, lo + 1);
      const v = frame.bands[lo] + (frame.bands[hi] - frame.bands[lo]) * (pos - lo);

      const barH = Math.max(2, v * maxH);
      const x = margin + i * slot + (slot - barW) / 2;
      const color = samplePalette(palette, (i / bars) * 0.999);

      const grad = ctx.createLinearGradient(0, floorY - barH, 0, floorY);
      grad.addColorStop(0, rgba(color, 1));
      grad.addColorStop(1, rgba(color, 0.35));
      ctx.fillStyle = grad;
      ctx.fillRect(x, floorY - barH, barW, barH);

      // Wide low-alpha pass for bloom.
      ctx.fillStyle = rgba(color, 0.12 * v);
      ctx.fillRect(x - barW * 0.6, floorY - barH - 4, barW * 2.2, barH + 4);

      // Reflection.
      const refl = ctx.createLinearGradient(0, floorY, 0, floorY + barH * 0.45);
      refl.addColorStop(0, rgba(color, 0.28));
      refl.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = refl;
      ctx.fillRect(x, floorY + 2, barW, barH * 0.45);

      // Peak cap.
      const p = peaks.current;
      p[i] = Math.max(v, p[i] - frame.dt * 0.35);
      ctx.fillStyle = rgba([255, 255, 255], 0.85);
      ctx.fillRect(x, floorY - Math.max(2, p[i] * maxH) - 4, barW, 2);
    }
    ctx.globalCompositeOperation = "source-over";
  });

  return <canvas ref={canvasRef} className={CANVAS_CLASS} />;
}
