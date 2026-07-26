import { getSettings } from "../lib/storage";

// Read once at mount, not live — a theme change takes effect on the next page load.
export function applyTheme(host: HTMLElement): void {
  getSettings().then((settings) => {
    if (settings.theme !== "system") host.dataset.theme = settings.theme;
  });
}
