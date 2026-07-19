import { useEffect, useRef, useState } from "preact/hooks";
import type { PlatformAdapter } from "../../content-scripts/adapters/adapter.interface";
import { MOCK_FILES } from "./mock-files";

type ActiveTag = ReturnType<PlatformAdapter["getActiveTag"]>;

interface Props {
  adapter: PlatformAdapter;
}

export function FileTaggingRoot({ adapter }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Refs mirror the state above so the single document-level keydown
  // listener (registered once, below) always reads fresh values instead of
  // closing over stale ones from whichever render it was created in.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const activeTagRef = useRef<ActiveTag>(null);
  // Position-based, not query-text-based — ported from studying
  // @tiptap/suggestion's dismissedRange design (validated by its own test
  // suite). The rule: dismissal persists for as long as you keep editing
  // the SAME occurrence, no matter how much the query text changes, and
  // only clears when that occurrence disappears entirely or a genuinely
  // different occurrence forms elsewhere. A query-string comparison gets
  // both of those wrong — it clears too eagerly (continuing to type in the
  // same dismissed word wrongly reopens it) and too rarely (two distinct
  // occurrences that happen to share query text, most commonly two
  // separate empty-query "#"s, wrongly suppress each other).
  const lastDismissedOffsetRef = useRef<number | null>(null);

  function recompute() {
    const activeTag = adapter.getActiveTag();
    activeTagRef.current = activeTag;

    if (!activeTag) {
      // No match at all means there's nothing left for the dismissal to
      // apply to — clearing it here is what makes "delete the # and retype"
      // reopen correctly instead of staying dismissed forever.
      lastDismissedOffsetRef.current = null;
      setItems([]);
      setAnchorRect(null);
      return;
    }

    if (activeTag.startOffset === lastDismissedOffsetRef.current) {
      // Same occurrence as what was dismissed — stays dismissed regardless
      // of how the query text has changed since.
      setItems([]);
      setAnchorRect(null);
      return;
    }

    const query = activeTag.query.toLowerCase();
    const filtered = MOCK_FILES.filter((f) => f.toLowerCase().includes(query));
    setItems(filtered);
    setSelectedIndex(0);
    setAnchorRect(filtered.length > 0 ? adapter.getCaretRect() : null);
  }

  function dismiss() {
    if (activeTagRef.current) {
      lastDismissedOffsetRef.current = activeTagRef.current.startOffset;
    }
    setItems([]);
    setAnchorRect(null);
  }

  function selectItem(index: number) {
    const activeTag = activeTagRef.current;
    const item = itemsRef.current[index];
    if (!activeTag || !item) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(activeTag.range);

    // Mock content — real file contents come once P1-08 (GitHub file
    // reads) exists. This is proving the replace-on-select mechanic works,
    // not the real resolved-tag formatting.
    adapter.injectText(item);

    lastDismissedOffsetRef.current = null;
    setItems([]);
    setAnchorRect(null);
  }

  useEffect(() => {
    adapter.onComposeChange(recompute);

    // onComposeChange only fires on content mutation ("input"), but a lot of
    // relevant state changes are pure selection/caret movement with no text
    // edit at all — e.g. the first step of Cmd+A-then-delete is a pure
    // selection change. Studying @tiptap/suggestion showed their plugin
    // recomputes on every ProseMirror transaction, including selection-only
    // ones; selectionchange is the closest DOM equivalent we have.
    document.addEventListener("selectionchange", recompute);

    const onKeyDown = (event: KeyboardEvent) => {
      if (itemsRef.current.length === 0) return;

      // Focus left the compose box without an intervening text edit (no
      // "input" event to trigger a recompute) — dismiss defensively rather
      // than hijack a keypress meant for whatever the user is doing now.
      const box = adapter.findComposeBox();
      if (!box || !box.contains(document.activeElement)) {
        setItems([]);
        setAnchorRect(null);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, itemsRef.current.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        selectItem(selectedIndexRef.current);
      }
    };

    // Capture phase on document: rich-text editors (ProseMirror/Tiptap)
    // intercept these same keys directly on the compose node, and same-node
    // listener order is registration order regardless of capture/bubble
    // (confirmed the hard way in P1-06) — capture on document always wins.
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("selectionchange", recompute);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0 || !anchorRect) return null;

  return (
    <div
      class="pulldeck-dropdown"
      style={{ top: `${anchorRect.bottom + 4}px`, left: `${anchorRect.left}px` }}
    >
      {items.map((item, i) => (
        <div
          key={item}
          class={`pulldeck-dropdown-item${i === selectedIndex ? " selected" : ""}`}
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(event) => {
            event.preventDefault(); // keep focus in the compose box
            selectItem(i);
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
