import { render } from "preact";
import type { PlatformAdapter } from "../../content-scripts/adapters/adapter.interface";
import { applyTheme } from "../../content-scripts/apply-theme";
import { FileTaggingRoot } from "./FileTaggingRoot";
import { STYLES } from "./styles";

export function mountFileTagging(adapter: PlatformAdapter): void {
  const host = document.createElement("div");
  host.id = "pulldeck-file-tagging-root";
  document.body.appendChild(host);
  applyTheme(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);

  render(<FileTaggingRoot adapter={adapter} />, container);
}
