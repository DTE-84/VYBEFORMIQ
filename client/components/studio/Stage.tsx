import { lazy, Suspense } from "react";
import { useSettings } from "@/store/settings";
import Spectrum from "@/visuals/Spectrum";
import Orbit from "@/visuals/Orbit";
import Ambient from "@/visuals/Ambient";

// The WebGL modes pull in three.js, so load them only when first selected.
const Scene3D = lazy(() => import("@/visuals/Scene3D"));

export default function Stage() {
  const mode = useSettings((s) => s.mode);

  return (
    <div className="absolute inset-0 bg-black">
      {mode === "spectrum" && <Spectrum />}
      {mode === "orbit" && <Orbit />}
      {mode === "ambient" && <Ambient />}
      {(mode === "nebula" || mode === "tunnel") && (
        <Suspense fallback={null}>
          <Scene3D mode={mode} />
        </Suspense>
      )}
    </div>
  );
}
