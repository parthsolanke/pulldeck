import { render } from "preact";
import type { PlatformAdapter } from "../../content-scripts/adapters/adapter.interface";
import { FileTaggingRoot } from "./FileTaggingRoot";
import { STYLES } from "./styles";

// Build order step 1: prove the '#' trigger + injection mechanic works
// end-to-end before building anything else on top of it.
export function mountFileTagging(adapter: PlatformAdapter): void {
  const host = document.createElement("div");
  host.id = "pulldeck-file-tagging-root";
  document.body.appendChild(host);

  // Shadow DOM isolates our styles from the host page's CSS in both
  // directions — needed since this renders directly into ChatGPT/Claude's
  // own document, not a sandboxed frame.
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);

  render(<FileTaggingRoot adapter={adapter} />, container);
}
