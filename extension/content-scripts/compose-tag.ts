// Shared by every adapter, since both ChatGPT and Claude turned out to be
// standard contenteditable elements using the browser's normal Selection/
// Range APIs underneath (confirmed during the P1-01/P1-02 spikes) — only
// the compose-box selector differs per platform, not this logic.

export interface ActiveTag {
  query: string;
  range: Range;
}

/** Fires whenever the compose box's content changes (typing, deleting, pasting). */
export function onComposeChange(box: HTMLElement, callback: () => void): void {
  box.addEventListener("input", callback);
}

/**
 * If the caret currently sits right after an unresolved "#query" (no
 * whitespace between the '#' and the caret), returns the query text typed
 * so far and a Range spanning exactly that "#query" span. Returns null
 * otherwise. Stateless: always recomputed fresh from the current text and
 * caret position, never remembers anything between calls.
 */
export function getActiveTag(box: HTMLElement): ActiveTag | null {
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

  const query = textBeforeCaret.slice(hashIndex + 1);
  // Whitespace anywhere in the query means the tag already ended — this is
  // what makes "typing a space cancels the tag" fall out for free, with no
  // extra state.
  if (/\s/.test(query)) return null;

  const range = rangeFromTextOffsets(box, hashIndex + 1, textBeforeCaret.length);
  if (!range) return null;

  return { query, range };
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
