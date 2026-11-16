import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BAND_COUNT, getFrame } from "@/audio/engine";
import { activeColors, useSettings } from "@/store/settings";

const scratch = new THREE.Color();

/** Read the active palette into three reusable THREE.Color objects. */
function usePaletteColors() {
  const colors = useRef([new THREE.Color(), new THREE.Color(), new THREE.Color()]);
  const key = useRef("");
  return () => {
    const hex = activeColors(useSettings.getState());
    const k = hex.join();
    if (k !== key.current) {
      key.current = k;
      hex.forEach((h, i) => colors.current[i].set(h));
    }
    return colors.current;
  };
}

function samplePalette(colors: THREE.Color[], t: number, out: THREE.Color) {
  const x = (((t % 1) + 1) % 1) * colors.length;
  const i = Math.floor(x);
  return out
    .copy(colors[i % colors.length])
    .lerp(colors[(i + 1) % colors.length], x - i);
}

/* ------------------------------------------------------------------ */
/* Nebula                                                              */
/* ------------------------------------------------------------------ */

const NEBULA_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uBeat;
  uniform float uSize;
  uniform float uBands[${BAND_COUNT}];
  attribute float aBand;
  attribute float aSeed;
  varying float vBand;
  varying float vEnergy;

  void main() {
    float energy = uBands[int(clamp(aBand, 0.0, 0.999) * ${BAND_COUNT}.0)];
    vec3 p = position;
    float r = length(p);

    // Inner particles orbit faster than outer ones.
    float angle = uTime * 0.12 * (1.6 - r * 0.25);
    float c = cos(angle);
    float s = sin(angle);
    p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    // Push outward with this particle's frequency band and the bass.
    p += normalize(p) * (energy * 1.3 + uBass * 0.8 + uBeat * 0.3) * (0.35 + aSeed);
    p.y += sin(uTime * 0.6 + aSeed * 40.0) * 0.06;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aSeed) * (1.0 + energy * 1.8) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vBand = aBand;
    vEnergy = energy;
  }
`;

const NEBULA_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying float vBand;
  varying float vEnergy;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float falloff = smoothstep(0.5, 0.0, d);
    vec3 color = vBand < 0.5
      ? mix(uColorA, uColorB, vBand * 2.0)
      : mix(uColorB, uColorC, (vBand - 0.5) * 2.0);
    color += vec3(1.0) * vEnergy * 0.25;
    gl_FragColor = vec4(color, falloff * (0.3 + vEnergy * 0.9));
  }
`;

function Nebula() {
  const density = useSettings((s) => s.density);
  const count = Math.round(2500 + density * 17500);
  const getColors = usePaletteColors();
  const group = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const bands = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Flattened sphere: lows near the core, highs at the edge.
      const u = Math.random();
      const r = 0.6 + Math.pow(u, 0.7) * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.55;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      bands[i] = Math.min(0.999, Math.max(0, u * 0.85 + Math.random() * 0.15));
      seeds[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aBand", new THREE.BufferAttribute(bands, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: NEBULA_VERTEX,
        fragmentShader: NEBULA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uBeat: { value: 0 },
          uSize: { value: 30 },
          uBands: { value: new Float32Array(BAND_COUNT) },
          uColorA: { value: new THREE.Color() },
          uColorB: { value: new THREE.Color() },
          uColorC: { value: new THREE.Color() },
        },
      }),
    [],
  );

  useFrame(({ gl, camera }) => {
    const frame = getFrame();
    const u = material.uniforms;
    u.uTime.value = frame.time;
    u.uBass.value = frame.bass;
    u.uBeat.value = frame.beat;
    // Scale with the canvas so particles look the same on any screen size.
    u.uSize.value = gl.domElement.height * 0.022;
    (u.uBands.value as Float32Array).set(frame.bands);
    const colors = getColors();
    u.uColorA.value.copy(colors[0]);
    u.uColorB.value.copy(colors[1]);
    u.uColorC.value.copy(colors[2]);

    if (group.current) {
      group.current.rotation.y += frame.dt * (0.04 + frame.level * 0.25);
      group.current.rotation.x = Math.sin(frame.time * 0.1) * 0.25 + 0.35;
    }
    camera.position.z = 7.2 - frame.bass * 0.8;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Tunnel                                                              */
/* ------------------------------------------------------------------ */

const RING_SIDES = [3, 6, 4, 48, 5];
const RING_SPACING = 1.5;

function Tunnel() {
  const density = useSettings((s) => s.density);
  const ringCount = Math.round(18 + density * 44);
  const starCount = Math.round(300 + density * 1500);
  const depth = ringCount * RING_SPACING;
  const getColors = usePaletteColors();

  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const starsRef = useRef<THREE.Points>(null);

  const ringGeometries = useMemo(
    () => RING_SIDES.map((sides) => new THREE.TorusGeometry(1.7, 0.022, 6, sides)),
    [],
  );

  const ringMaterials = useMemo(
    () =>
      Array.from(
        { length: ringCount },
        () =>
          new THREE.MeshBasicMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [ringCount],
  );

  const starGeometry = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 3.2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = -Math.random() * depth;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [starCount, depth]);

  const starMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.035,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ camera }) => {
    const frame = getFrame();
    const colors = getColors();
    const speed = 1.6 + frame.level * 9 + frame.beat * 5;
    const travel = speed * frame.dt;

    for (let i = 0; i < ringCount; i++) {
      const mesh = rings.current[i];
      if (!mesh) continue;
      mesh.position.z += travel;
      if (mesh.position.z > 0.5) mesh.position.z -= depth;

      const band = frame.bands[(i * 7) % BAND_COUNT];
      const scale = 1 + band * 0.55 + frame.beat * 0.08;
      mesh.scale.set(scale, scale, 1);
      mesh.rotation.z +=
        frame.dt * (0.12 + frame.mid * 0.9) * (i % 2 === 0 ? 1 : -1);

      // Fade in from the far end, brighten with the ring's own band.
      const far = 1 - Math.min(1, -mesh.position.z / depth);
      const material = ringMaterials[i];
      samplePalette(colors, i / ringCount + frame.time * 0.04, scratch);
      material.color.copy(scratch).multiplyScalar(0.45 + band * 1.1);
      material.opacity = Math.min(1, far * 1.4) * (0.35 + band * 0.65);
    }

    const stars = starsRef.current;
    if (stars) {
      const position = stars.geometry.attributes.position as THREE.BufferAttribute;
      const array = position.array as Float32Array;
      for (let i = 2; i < array.length; i += 3) {
        array[i] += travel * 1.4;
        if (array[i] > 0.5) array[i] -= depth;
      }
      position.needsUpdate = true;
      starMaterial.color.copy(colors[2]);
    }

    camera.position.x = Math.sin(frame.time * 0.35) * 0.35;
    camera.position.y = Math.cos(frame.time * 0.27) * 0.25;
    camera.rotation.z = Math.sin(frame.time * 0.15) * 0.25;
  });

  return (
    <>
      {ringMaterials.map((material, i) => (
        <mesh
          key={i}
          ref={(m) => (rings.current[i] = m)}
          geometry={ringGeometries[i % ringGeometries.length]}
          material={material}
          position={[0, 0, -i * RING_SPACING]}
          rotation={[0, 0, i * 0.21]}
        />
      ))}
      <points
        ref={starsRef}
        geometry={starGeometry}
        material={starMaterial}
        frustumCulled={false}
      />
    </>
  );
}

export default function Scene3D({ mode }: { mode: "nebula" | "tunnel" }) {
  return (
    <Canvas
      key={mode}
      className="!absolute inset-0"
      dpr={[1, 2]}
      camera={
        mode === "nebula"
          ? { position: [0, 0, 7.2], fov: 60 }
          : { position: [0, 0, 0], fov: 80, near: 0.05, far: 200 }
      }
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#000000")}
    >
      {mode === "nebula" ? <Nebula /> : <Tunnel />}
    </Canvas>
  );
}
