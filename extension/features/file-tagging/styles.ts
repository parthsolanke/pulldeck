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
  :host {
    all: initial;
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
    border-radius: var(--pd-radius);
    border: 1px solid var(--pd-border);
    background: var(--pd-bg);
    box-shadow: var(--pd-shadow);
    font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--pd-text);
    animation: pulldeck-fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1);

    ${DESIGN_TOKENS_LIGHT}
  }

  @media (prefers-color-scheme: dark) {
    .pulldeck-dropdown {
      ${DESIGN_TOKENS_DARK}
    }
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
`;
