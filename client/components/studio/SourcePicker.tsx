import type { LucideIcon } from "lucide-react";
import { Disc3, FolderOpen, Mic, MonitorSpeaker } from "lucide-react";
import {
  playQueue,
  startMicrophone,
  startSystemAudio,
  systemAudioSupported,
} from "@/audio/engine";
import { pickFiles } from "@/audio/pickFiles";
import { FEATURED_TRACKS } from "@/data/tracks";

function Option({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-primary/60 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="block text-xs leading-snug text-zinc-400">{detail}</span>
      </span>
    </button>
  );
}

/** Shown while nothing is playing: choose where the sound comes from. */
export default function SourcePicker() {
  return (
    <div className="absolute inset-x-0 bottom-0 top-32 z-20 flex overflow-y-auto px-4 pb-6 sm:top-20">
      <div className="m-auto w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Pick a sound source
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          The visuals react to whatever you feed them. Audio is analysed in
          your browser and never uploaded.
        </p>

        <div className="mt-6 space-y-3">
          {systemAudioSupported() && (
            <Option
              icon={MonitorSpeaker}
              title="Listen to this device"
              detail="Share a tab or screen with audio on. Works with Spotify, Pandora, YouTube or anything else already playing."
              onClick={startSystemAudio}
            />
          )}
          <Option
            icon={Mic}
            title="Use the microphone"
            detail="Reacts to the room: play music through your speakers and it follows along."
            onClick={startMicrophone}
          />
          <Option
            icon={FolderOpen}
            title="Open audio files"
            detail="Choose files, or drop them anywhere on this page."
            onClick={pickFiles}
          />
          {FEATURED_TRACKS.length > 0 && (
            <Option
              icon={Disc3}
              title="Play a featured track"
              detail="Start with something from the Creator Studio."
              onClick={() => playQueue(FEATURED_TRACKS, 0)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
