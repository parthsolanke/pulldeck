// Shared by every adapter — Enter-to-send is a near-universal convention
// across chat UIs and doesn't require knowing the site's actual Send button
// selector at all.

/**
 * Fires when Enter (without Shift, and not mid-IME-composition) is pressed
 * inside the compose box with non-empty content — the standard "send"
 * convention across chat UIs. Delegates via `document` in the capture
 * phase rather than attaching directly to the box: rich-text editors
 * (ProseMirror/Tiptap) register their own keydown handling directly on the
 * same contenteditable node to intercept Enter themselves, and listener
 * order on the same node is registration order regardless of capture vs.
 * bubble — so a listener attached later, directly on the box, can lose to
 * the editor's own handler. A capture-phase listener on `document` always
 * fires first, before the event reaches the target at all.
 */
export function onEnterToSend(box: HTMLElement, callback: () => void): void {
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

/**
 * Fires when a click lands on (or inside) an element matching `selector`,
 * anywhere on the page. Uses event delegation on `document` rather than
 * attaching directly to the button, since Send buttons are often
 * conditionally rendered (e.g. swapped in for a voice-input button only
 * once the compose box has content) and may not exist in the DOM yet when
 * the adapter mounts. Listens during the capture phase — bubble-phase
 * listeners lose if the site's own click handler calls stopPropagation(),
 * which capture (top-down, before bubbling) isn't affected by.
 */
export function onSendClick(selector: string, callback: () => void): void {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(selector)) callback();
    },
    { capture: true },
  );
}
