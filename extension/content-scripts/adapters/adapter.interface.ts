export interface PlatformAdapter {
  readonly name: string;
  findComposeBox(): HTMLElement | null;
  injectText(text: string): void;
  onMessageSent(callback: () => void): void;
  isReady(): boolean;

  /** Fires whenever the compose box's content changes (typing, deleting, pasting). */
  onComposeChange(callback: () => void): void;

  /**
   * If the caret currently sits right after an unresolved "#query" (no
   * whitespace between the '#' and the caret), returns the query text typed
   * so far and a Range spanning exactly that "#query" span — so it can be
   * selected and replaced later via injectText. Returns null otherwise.
   * Stateless: always recomputed fresh from the current text and caret,
   * never remembers anything between calls. Any dismissal behavior (e.g.
   * Escape) belongs in the feature module that consumes this, not here.
   */
  getActiveTag(): { query: string; range: Range } | null;

  /**
   * Bounding rect of the current caret position, for positioning the
   * autocomplete dropdown. Returns null if the caret isn't inside the
   * compose box.
   */
  getCaretRect(): DOMRect | null;
}
