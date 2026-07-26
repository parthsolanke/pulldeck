import { DESIGN_TOKENS_LIGHT, DESIGN_TOKENS_DARK } from "./design-tokens";
import { applyTheme } from "./apply-theme";

// Plain DOM, not Preact — a status line and a dismiss button don't need the
// state machinery the file-tagging dropdown needed.

export type MountStatusState = "loading" | "success" | "failed";

const AUTO_DISMISS_MS: Record<Exclude<MountStatusState, "loading">, number> = {
  success: 3000,
  failed: 8000,
};

const STYLES = `
  :host {
    all: initial;
  }

  .pulldeck-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 280px;
    padding: 12px 14px;
    box-sizing: border-box;
    border-radius: var(--pd-radius);
    border: 1px solid var(--pd-border);
    background: var(--pd-bg);
    box-shadow: var(--pd-shadow);
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--pd-text);
    animation: pulldeck-banner-in 200ms cubic-bezier(0.16, 1, 0.3, 1);

    ${DESIGN_TOKENS_LIGHT}
  }

  @media (prefers-color-scheme: dark) {
    .pulldeck-banner {
      ${DESIGN_TOKENS_DARK}
    }
  }

  /* Set by applyTheme() only for an explicit theme, outranking the media query above by specificity. */
  :host([data-theme="dark"]) .pulldeck-banner {
    ${DESIGN_TOKENS_DARK}
  }

  :host([data-theme="light"]) .pulldeck-banner {
    ${DESIGN_TOKENS_LIGHT}
  }

  @keyframes pulldeck-banner-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-banner {
      animation: none;
    }
  }

  .pulldeck-banner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .pulldeck-banner-brand {
    font-weight: 600;
    color: var(--pd-accent);
    letter-spacing: 0.01em;
  }

  .pulldeck-banner-body {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pulldeck-banner-text {
    color: var(--pd-text);
  }

  .pulldeck-banner-spinner {
    display: none;
    width: 12px;
    height: 12px;
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid var(--pd-border);
    border-top-color: var(--pd-accent);
    flex-shrink: 0;
    animation: pulldeck-spin 700ms linear infinite;
  }

  .pulldeck-banner.loading .pulldeck-banner-spinner {
    display: inline-block;
  }

  @keyframes pulldeck-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-banner-spinner {
      animation: none;
    }
  }

  .pulldeck-banner-close {
    all: unset;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    color: var(--pd-text);
    opacity: 0.6;
    padding: 0 2px;
    flex-shrink: 0;
  }

  .pulldeck-banner-close:hover,
  .pulldeck-banner-close:focus-visible {
    opacity: 1;
  }

  .pulldeck-banner-close:focus-visible {
    outline: 2px solid var(--pd-accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

let host: HTMLDivElement | null = null;
let bannerEl: HTMLDivElement | null = null;
let textEl: HTMLSpanElement | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function ensureBanner(): { banner: HTMLDivElement; text: HTMLSpanElement } {
  if (host && bannerEl && textEl) {
    return { banner: bannerEl, text: textEl };
  }

  host = document.createElement("div");
  host.id = "pulldeck-mount-status-root";
  document.body.appendChild(host);
  applyTheme(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const banner = document.createElement("div");
  banner.className = "pulldeck-banner";

  const header = document.createElement("div");
  header.className = "pulldeck-banner-header";

  const brand = document.createElement("span");
  brand.className = "pulldeck-banner-brand";
  brand.textContent = "pulldeck";
  header.appendChild(brand);

  const closeButton = document.createElement("button");
  closeButton.className = "pulldeck-banner-close";
  closeButton.setAttribute("aria-label", "Dismiss");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", dismiss);
  header.appendChild(closeButton);

  banner.appendChild(header);

  const body = document.createElement("div");
  body.className = "pulldeck-banner-body";

  const spinner = document.createElement("span");
  spinner.className = "pulldeck-banner-spinner";
  body.appendChild(spinner);

  const text = document.createElement("span");
  text.className = "pulldeck-banner-text";
  body.appendChild(text);

  banner.appendChild(body);

  shadow.appendChild(banner);

  bannerEl = banner;
  textEl = text;

  return { banner, text };
}

function dismiss(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  host?.remove();
  host = null;
  bannerEl = null;
  textEl = null;
}

export function showMountStatus(
  state: MountStatusState,
  message: string,
): void {
  const { banner, text } = ensureBanner();
  banner.classList.toggle("loading", state === "loading");
  text.textContent = message;

  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }

  if (state !== "loading") {
    dismissTimer = setTimeout(dismiss, AUTO_DISMISS_MS[state]);
  }
}
