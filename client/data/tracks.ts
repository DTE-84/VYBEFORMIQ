export interface Track {
  title: string;
  artist?: string;
  src: string;
}

/**
 * Creator Studio: tracks that ship with the site. Drop new files in /public
 * and list them here, e.g. { title: "Song", artist: "Artist", src: "/song.mp3" }.
 * While this list is empty the Creator Studio button and the featured-track
 * option are hidden.
 */
export const FEATURED_TRACKS: Track[] = [];
