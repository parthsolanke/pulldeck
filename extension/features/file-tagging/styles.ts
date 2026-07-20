import {
  DESIGN_TOKENS_LIGHT,
  DESIGN_TOKENS_DARK,
} from "../../content-scripts/design-tokens";

// Injected as a <style> tag inside our Shadow DOM host, isolated from the
// host page's CSS in both directions.

// Exported so FileTaggingRoot's flip-to-open-upward logic uses the same
// number as the CSS cap, instead of two magic numbers drifting apart.
export const DROPDOWN_MAX_HEIGHT = 240;

export const STYLES = `
  /* On :host, not .pulldeck-dropdown, so every top-level element in this
     shadow root (dropdown, chips) can see these custom properties. */
  :host {
    all: initial;
    ${DESIGN_TOKENS_LIGHT}
  }

  @media (prefers-color-scheme: dark) {
    :host {
      ${DESIGN_TOKENS_DARK}
    }
  }

  .pulldeck-dropdown {
    position: fixed;
    z-index: 2147483647;
    min-width: 280px;
    max-width: 480px;
    max-height: ${DROPDOWN_MAX_HEIGHT}px;
    overflow-y: auto;
    padding: 4px;
    box-sizing: border-box;
    /* Reserves the same inset for scrollIntoView's "nearest" calculation
       (arrow-key navigation) — without this, scrollIntoView aligns the
       selected row's border box flush with the container edge, ignoring
       padding/margin entirely, since it only knows about the border box. */
    scroll-padding: 4px 0;
    border-radius: var(--pd-radius);
    border: 1px solid var(--pd-border);
    background: var(--pd-bg);
    box-shadow: var(--pd-shadow);
    font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--pd-text);
    animation: pulldeck-fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pulldeck-dropdown.flipped {
    animation-name: pulldeck-fade-in-flipped;
  }

  @keyframes pulldeck-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pulldeck-fade-in-flipped {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-dropdown {
      animation: none;
    }
  }

  .pulldeck-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    box-sizing: border-box;
  }

  .pulldeck-dropdown-item.selected {
    background: var(--pd-hover-bg);
  }

  .pulldeck-dropdown-item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .pulldeck-dropdown-item-name {
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .pulldeck-dropdown-item-name strong {
    color: var(--pd-accent);
    font-weight: 600;
  }

  .pulldeck-dropdown-item-path {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
    color: var(--pd-text);
    opacity: 0.5;
    font-size: 12px;
  }

  /* Anchored to the compose box's own outer edge, not text inside it —
     same place chat apps show attachments (Slack, Discord, WhatsApp). */
  .pulldeck-file-tray {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pulldeck-file-chip {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px 4px 10px;
    border-radius: 999px;
    background: var(--pd-hover-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--pd-border);
    color: var(--pd-accent);
    font: 600 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    white-space: nowrap;
    box-shadow: var(--pd-shadow);
    animation: pulldeck-fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pulldeck-file-chip.error {
    color: #dc4444;
  }

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-file-chip {
      animation: none;
    }
  }

  /* Icon and the remove button occupy the same slot, stacked — hovering the
     chip fades the icon out and the remove button in, rather than showing
     the remove button as a separate always-visible element. */
  .pulldeck-file-chip-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
  }

  .pulldeck-file-chip-icon-visual {
    width: 16px;
    height: 16px;
    opacity: 0.85;
    transition: opacity 100ms ease;
  }

  .pulldeck-file-chip-spinner {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1.5px solid var(--pd-border);
    border-top-color: var(--pd-accent);
    animation: pulldeck-spin 0.6s linear infinite;
    transition: opacity 100ms ease;
  }

  @keyframes pulldeck-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-file-chip-spinner {
      animation: none;
    }
  }

  .pulldeck-file-chip-remove {
    all: unset;
    position: absolute;
    inset: -3px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 100ms ease;
  }

  .pulldeck-file-chip:hover .pulldeck-file-chip-icon-visual,
  .pulldeck-file-chip:hover .pulldeck-file-chip-spinner {
    opacity: 0;
  }

  .pulldeck-file-chip:hover .pulldeck-file-chip-remove {
    opacity: 1;
    pointer-events: auto;
  }

  .pulldeck-file-chip-remove:hover {
    background: var(--pd-border);
  }
`;
