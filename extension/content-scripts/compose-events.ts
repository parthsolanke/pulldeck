/** Fires on Enter (no Shift, not mid-IME-composition) with non-empty content. */
export function onEnterToSend(box: HTMLElement, callback: () => void): void {
  // Capture phase on document, not attached to the box: rich-text editors
  // register their own keydown handling on the same node, and same-node
  // listener order is registration order regardless of capture vs. bubble.
  document.addEventListener(
    "keydown",
    (event) => {
      if (!box.contains(event.target as Node)) return;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (!box.textContent?.trim()) return;
      callback();
    },
    { capture: true },
  );
}

/** Fires when a click lands on (or inside) an element matching `selector`, anywhere on the page. */
export function onSendClick(selector: string, callback: () => void): void {
  // Delegated on document (the button often doesn't exist until there's
  // content) and capture phase (bubble loses if the site stops propagation).
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(selector)) callback();
    },
    { capture: true },
  );
}
