export interface PlatformAdapter {
  readonly name: string;

  /** Whether the current URL plausibly renders a chat composer. */
  isChatRoute(): boolean;

  findComposeBox(): HTMLElement | null;
  injectText(text: string): void;
  onMessageSent(callback: () => void): void;

  /** Fires on the same Enter/click that sends, before the platform reads the text. */
  onBeforeSend(callback: () => void): void;

  isReady(): boolean;

  /** Fires whenever the compose box's content changes (typing, deleting, pasting). */
  onComposeChange(callback: () => void): void;

  /**
   * The unresolved "#query" at the caret, if any: its text, a Range over
   * exactly that span, and the '#' character offset (a stable id for the
   * occurrence, independent of query text). Stateless — recomputed fresh
   * on every call.
   */
  getActiveTag(): { query: string; range: Range; startOffset: number } | null;

  /** Caret's bounding rect, for positioning a dropdown. Null if caret isn't in the box. */
  getCaretRect(): DOMRect | null;

  /** Finds the first occurrence of `searchText` in the box's current content, or null. */
  findTextRange(searchText: string): Range | null;
}
