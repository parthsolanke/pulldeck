export interface ActiveTag {
  query: string;
  range: Range;
  /** Character offset of the '#'. A stable id for the occurrence, independent of query text. */
  startOffset: number;
}

/** Fires whenever the compose box's content changes (typing, deleting, pasting). */
export function onComposeChange(getBox: () => HTMLElement | null, callback: () => void): void {
  // Re-resolved each event, not a captured box — Claude remounts the compose box after a send.
  document.addEventListener("input", (event) => {
    const box = getBox();
    if (!box || !box.contains(event.target as Node)) return;
    callback();
  });
}

// IME composition state can only be observed via events, so it's tracked
// lazily per box rather than computed fresh like the rest of getActiveTag.
const composingBoxes = new WeakSet<HTMLElement>();
const compositionTrackedBoxes = new WeakSet<HTMLElement>();

function ensureCompositionTracking(box: HTMLElement): void {
  if (compositionTrackedBoxes.has(box)) return;
  compositionTrackedBoxes.add(box);
  box.addEventListener("compositionstart", () => composingBoxes.add(box));
  box.addEventListener("compositionend", () => composingBoxes.delete(box));
}

/**
 * If the caret currently sits right after an unresolved "#query" (no
 * whitespace between the '#' and the caret), returns the query text typed
 * so far and a Range spanning exactly that "#query" span. Returns null
 * otherwise. Stateless: always recomputed fresh from the current text and
 * caret position, never remembers anything between calls.
 */
export function getActiveTag(box: HTMLElement): ActiveTag | null {
  ensureCompositionTracking(box);
  if (composingBoxes.has(box)) return null;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const caretRange = selection.getRangeAt(0);
  if (!box.contains(caretRange.startContainer)) return null;

  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(box);
  preCaretRange.setEnd(caretRange.startContainer, caretRange.startOffset);
  const textBeforeCaret = preCaretRange.toString();

  const hashIndex = textBeforeCaret.lastIndexOf("#");
  if (hashIndex === -1) return null;

  // '#' must start a fresh word (preceded by whitespace or be first) —
  // avoids false triggers mid-word, e.g. "C#" or "note#1".
  const charBeforeHash = hashIndex > 0 ? textBeforeCaret[hashIndex - 1] : null;
  if (charBeforeHash !== null && !/\s/.test(charBeforeHash)) return null;

  const query = textBeforeCaret.slice(hashIndex + 1);
  // Whitespace in the query means the tag already ended.
  if (/\s/.test(query)) return null;

  // Starts at '#' itself, not hashIndex + 1 — the whole "#query" span must be replaceable.
  const range = rangeFromTextOffsets(box, hashIndex, textBeforeCaret.length);
  if (!range) return null;

  return { query, range, startOffset: hashIndex };
}

/**
 * Bounding rect of the current caret position, for positioning the
 * autocomplete dropdown. Returns null if the caret isn't inside the compose
 * box.
 */
export function getCaretRect(box: HTMLElement): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!box.contains(range.startContainer)) return null;

  const rects = range.getClientRects();
  if (rects.length > 0) return rects[0];

  // A collapsed range at certain positions (e.g. an empty paragraph) can
  // return no client rects at all — fall back to the containing element's
  // own rect rather than returning nothing.
  const el =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement;
  return el?.getBoundingClientRect() ?? null;
}

/** Finds the first occurrence of `searchText` in the box's current text and returns a Range over it, or null if not found. */
export function findTextRange(box: HTMLElement, searchText: string): Range | null {
  const fullText = box.textContent ?? "";
  const index = fullText.indexOf(searchText);
  if (index === -1) return null;
  return rangeFromTextOffsets(box, index, index + searchText.length);
}

/** Converts plain-text character offsets (relative to root's full text content) into a DOM Range. */
function rangeFromTextOffsets(
  root: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let charIndex = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length ?? 0;
    const nodeEnd = charIndex + nodeLength;

    if (startNode === null && start <= nodeEnd) {
      startNode = node;
      startOffset = start - charIndex;
    }
    if (end <= nodeEnd) {
      endNode = node;
      endOffset = end - charIndex;
      break;
    }
    charIndex = nodeEnd;
  }

  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
