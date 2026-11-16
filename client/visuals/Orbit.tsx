import { useRef } from "react";
import { BAND_COUNT } from "@/audio/engine";
import { CANVAS_CLASS, rgba, samplePalette, useCanvas2D, type RGB } from "./shared";

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  life: number;
  size: number;
  hue: number;
}

/** Circular spectrum and waveform with particles thrown outward on the beat. */
export default function Orbit() {
  const particles = useRef<Particle[]>([]);
  const lastBeat = useRef(0);

  const canvasRef = useCanvas2D(({ ctx, w, h, frame, palette, density }) => {
    // Translucent wipe leaves short motion trails.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const unit = Math.min(w, h);
    const base = unit * (0.17 + frame.bass * 0.035);
    const t = frame.time;

    ctx.globalCompositeOperation = "lighter";

    // Core glow.
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.6);
    core.addColorStop(0, rgba(palette[0], 0.1 + frame.bass * 0.3));
    core.addColorStop(0.6, rgba(palette[1], 0.05 + frame.level * 0.08));
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.fillRect(cx - base * 1.6, cy - base * 1.6, base * 3.2, base * 3.2);

    // Radial spikes, mirrored left/right so lows sit at the top.
    const spikes = Math.round(70 + density * 190);
    const rot = t * 0.05 - Math.PI / 2;
    for (let i = 0; i < spikes; i++) {
      const half = i / spikes < 0.5 ? (i / spikes) * 2 : (1 - i / spikes) * 2;
      const pos = half * (BAND_COUNT - 1) * 0.85;
      const lo = Math.floor(pos);
      const v =
        frame.bands[lo] +
        (frame.bands[Math.min(BAND_COUNT - 1, lo + 1)] - frame.bands[lo]) * (pos - lo);
      const len = v * unit * 0.2 + 2;
      const a = (i / spikes) * Math.PI * 2 + rot;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const color = samplePalette(palette, half * 0.999);

      ctx.strokeStyle = rgba(color, 0.16 * v + 0.03);
      ctx.lineWidth = 5 + v * 6;
      ctx.beginPath();
      ctx.moveTo(cx + cos * base, cy + sin * base);
      ctx.lineTo(cx + cos * (base + len), cy + sin * (base + len));
      ctx.stroke();

      ctx.strokeStyle = rgba(color, 0.55 + v * 0.45);
      ctx.lineWidth = 1 + v * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + cos * base, cy + sin * base);
      ctx.lineTo(cx + cos * (base + len), cy + sin * (base + len));
      ctx.stroke();
    }

    // Waveform ring just inside the spikes.
    const waveR = base * 0.82;
    const step = 8;
    ctx.strokeStyle = rgba(palette[2], 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= frame.wave.length; i += step) {
      const s = (frame.wave[i % frame.wave.length] - 128) / 128;
      const a = (i / frame.wave.length) * Math.PI * 2 - t * 0.12;
      const r = waveR + s * base * 0.35;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Thin guide rings that breathe with the mids and highs.
    const rings: [number, RGB, number][] = [
      [base * 0.55, palette[1], 0.25 + frame.mid * 0.4],
      [base * (2.3 + frame.mid * 0.25), palette[1], 0.1 + frame.mid * 0.25],
      [base * (2.9 + frame.treble * 0.3), palette[2], 0.06 + frame.treble * 0.3],
    ];
    for (const [r, color, alpha] of rings) {
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Particles: a burst on each beat, a trickle otherwise.
    const list = particles.current;
    const cap = Math.round(150 + density * 900);
    const isBeat = frame.beat > 0.95 && t - lastBeat.current > 0.12;
    if (isBeat) lastBeat.current = t;
    let spawn = isBeat ? Math.round(12 + density * 60) : frame.level > 0.12 ? 1 : 0;
    while (spawn-- > 0 && list.length < cap) {
      list.push({
        angle: Math.random() * Math.PI * 2,
        radius: base * (0.95 + Math.random() * 0.2),
        speed: unit * (0.08 + Math.random() * 0.3) * (isBeat ? 1.4 : 0.7),
        life: 1,
        size: 0.8 + Math.random() * 2,
        hue: Math.random(),
      });
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.radius += p.speed * frame.dt * (0.5 + frame.level * 1.2);
      p.angle += frame.dt * 0.15;
      p.life -= frame.dt * 0.45;
      if (p.life <= 0 || p.radius > unit) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      ctx.fillStyle = rgba(samplePalette(palette, p.hue), p.life * 0.9);
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(p.angle) * p.radius,
        cy + Math.sin(p.angle) * p.radius,
        p.size,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  });

  return <canvas ref={canvasRef} className={CANVAS_CLASS} />;
}
