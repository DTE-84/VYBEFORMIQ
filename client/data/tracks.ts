export interface Track {
  title: string;
  artist?: string;
  src: string;
}

/**
 * Creator Studio: tracks that ship with the site. Drop new files in /public
 * and list them here.
 */
export const FEATURED_TRACKS: Track[] = [
  { title: "Nexus Flow", artist: "Keys Beats", src: "/nexus-flow.mp3" },
  { title: "Signal Clarity", artist: "Keys Beats", src: "/signal-clarity.mp3" },
  { title: "Kinetic Neon", artist: "Keys Beats", src: "/kinetic-neon.mp3" },
];
