import { useRef } from "react";
import { CANVAS_CLASS, rgba, samplePalette, useCanvas2D } from "./shared";

const BLOBS = [
  { fx: 0.11, fy: 0.07, px: 0.0, py: 1.3, size: 0.55, hue: 0.0 },
  { fx: 0.07, fy: 0.13, px: 2.1, py: 0.4, size: 0.5, hue: 0.33 },
  { fx: 0.05, fy: 0.09, px: 4.0, py: 2.6, size: 0.62, hue: 0.66 },
  { fx: 0.09, fy: 0.05, px: 1.2, py: 5.0, size: 0.42, hue: 0.5 },
  { fx: 0.06, fy: 0.11, px: 3.3, py: 3.9, size: 0.48, hue: 0.85 },
];

/**
 * Slow drifting colour fields. Everything is heavily smoothed so nothing
 * flashes: meant to sit on a second monitor without pulling focus.
 */
export default function Ambient() {
  const smooth = useRef({ level: 0.1, bass: 0.1 });

  const canvasRef = useCanvas2D(({ ctx, w, h, frame, palette }) => {
    const s = smooth.current;
    s.level += (frame.level - s.level) * Math.min(1, frame.dt * 0.8);
    s.bass += (frame.bass - s.bass) * Math.min(1, frame.dt * 1.2);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#020204";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";
    const unit = Math.max(w, h);
    const t = frame.time;
    for (const b of BLOBS) {
      const x = w * (0.5 + 0.38 * Math.sin(t * b.fx + b.px));
      const y = h * (0.5 + 0.36 * Math.cos(t * b.fy + b.py));
      const r = unit * b.size * (0.8 + s.bass * 0.45);
      const color = samplePalette(palette, b.hue + t * 0.006);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(color, 0.16 + s.level * 0.28));
      grad.addColorStop(0.5, rgba(color, 0.05 + s.level * 0.08));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // A single slow horizon line carrying a trace of the waveform.
    ctx.strokeStyle = rgba([255, 255, 255], 0.1 + s.level * 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const points = 96;
    for (let i = 0; i <= points; i++) {
      const sample =
        (frame.wave[Math.floor((i / points) * (frame.wave.length - 1))] - 128) / 128;
      const x = (i / points) * w;
      const y =
        h * 0.5 +
        Math.sin(i * 0.12 + t * 0.4) * h * 0.02 +
        sample * h * 0.05 * (0.4 + s.level);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  });

  return <canvas ref={canvasRef} className={CANVAS_CLASS} />;
}
