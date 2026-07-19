// Injected as a <style> tag inside our Shadow DOM host, isolated from the
// host page's CSS in both directions.
export const STYLES = `
  :host {
    all: initial;
  }

  .pulldeck-dropdown {
    position: fixed;
    z-index: 2147483647;
    min-width: 220px;
    max-width: 360px;
    max-height: 240px;
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

    --pd-accent: #6336f9;
    --pd-radius: 10px;
    --pd-bg: #ffffff;
    --pd-border: rgba(15, 22, 36, 0.1);
    --pd-text: rgba(29, 30, 32, 0.95);
    --pd-hover-bg: rgba(98, 41, 255, 0.08);
    --pd-shadow:
      0px 16px 48px 0px rgba(17, 24, 39, 0.04),
      0px 12px 24px 0px rgba(17, 24, 39, 0.04),
      0px 6px 8px 0px rgba(17, 24, 39, 0.02),
      0px 2px 3px 0px rgba(17, 24, 39, 0.02);
  }

  @media (prefers-color-scheme: dark) {
    .pulldeck-dropdown {
      --pd-bg: rgba(25, 25, 26, 1);
      --pd-border: rgba(238, 238, 246, 0.11);
      --pd-text: rgba(245, 245, 245, 0.96);
      --pd-hover-bg: rgba(122, 82, 255, 0.16);
      --pd-shadow:
        0px 16px 48px 0px rgba(0, 0, 0, 0.5),
        0px 12px 24px 0px rgba(0, 0, 0, 0.24),
        0px 6px 8px 0px rgba(0, 0, 0, 0.22),
        0px 2px 3px 0px rgba(0, 0, 0, 0.12);
    }
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

  @media (prefers-reduced-motion: reduce) {
    .pulldeck-dropdown {
      animation: none;
    }
  }

  .pulldeck-dropdown-item {
    padding: 6px 10px 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }

  .pulldeck-dropdown-item.selected {
    background: var(--pd-hover-bg);
  }
`;
