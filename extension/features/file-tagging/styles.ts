// Injected as a <style> tag inside our Shadow DOM host, so it's fully
// isolated from the host page's own CSS in both directions. System font
// stack (not a custom webface) deliberately — this needs to read as a fast,
// native utility sitting over someone else's product, not a branded moment.
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
    border-radius: 10px;
    border: 1px solid var(--pd-border);
    background: var(--pd-bg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16), 0 1px 2px rgba(0, 0, 0, 0.08);
    font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--pd-text);

    --pd-accent: #6336f9;
    --pd-bg: #ffffff;
    --pd-border: #e5e5ea;
    --pd-text: #1a1a1f;
    --pd-hover-bg: #f4f2ff;
  }

  @media (prefers-color-scheme: dark) {
    .pulldeck-dropdown {
      --pd-bg: #1e1e24;
      --pd-border: #33333c;
      --pd-text: #f2f2f5;
      --pd-hover-bg: #2a2440;
    }
  }

  .pulldeck-dropdown-item {
    padding: 6px 10px 6px 12px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }

  .pulldeck-dropdown-item.selected {
    background: var(--pd-hover-bg);
    border-left-color: var(--pd-accent);
  }
`;
