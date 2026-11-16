import { playFiles } from "./engine";

/** Open the system file dialog and play whatever audio files are chosen. */
export function pickFiles() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";
  input.multiple = true;
  input.onchange = () => {
    if (input.files?.length) playFiles(input.files);
  };
  input.click();
}
