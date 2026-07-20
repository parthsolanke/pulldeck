import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { PlatformAdapter } from "../../content-scripts/adapters/adapter.interface";
import type { FetchFileContentResponse } from "../../background/service-worker";
import { searchFiles, type FileMatch } from "./search";
import { DROPDOWN_MAX_HEIGHT } from "./styles";
import { isBinaryFile, getLanguageTag } from "./file-format";
import { getFileIconUrl, getDefaultFileIconUrl } from "./file-icons";
import { splitHighlightRuns } from "./highlight";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "file not found",
  rate_limited: "rate limited, try again later",
  no_active_repo: "no repo connected",
  unknown: "something went wrong",
};

const GAP = 4;

type ActiveTag = ReturnType<PlatformAdapter["getActiveTag"]>;

interface Props {
  adapter: PlatformAdapter;
}

export function FileTaggingRoot({ adapter }: Props) {
  const [items, setItems] = useState<FileMatch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Mirrored in refs so the keydown listener below (registered once) always
  // reads fresh values instead of closing over stale ones.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const activeTagRef = useRef<ActiveTag>(null);
  // Keyed by position, not query text: dismissal persists through continued
  // typing in the same occurrence, and clears when it disappears entirely
  // or a different occurrence forms elsewhere.
  const lastDismissedOffsetRef = useRef<number | null>(null);

  function recompute() {
    const activeTag = adapter.getActiveTag();
    activeTagRef.current = activeTag;

    if (!activeTag) {
      lastDismissedOffsetRef.current = null;
      setItems([]);
      setAnchorRect(null);
      return;
    }

    if (activeTag.startOffset === lastDismissedOffsetRef.current) {
      setItems([]);
      setAnchorRect(null);
      return;
    }

    const filtered = searchFiles(activeTag.query);
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
    const path = item.path;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(activeTag.range);

    if (isBinaryFile(path)) {
      adapter.injectText(`[can't preview binary file: ${path}]`);
    } else {
      // Placeholder gets a random suffix so it can be found again later,
      // even if the user keeps typing or edits elsewhere in the meantime.
      const placeholder = `⏳ ${path}·${Math.random().toString(36).slice(2, 8)}`;
      adapter.injectText(placeholder);
      fetchAndReplace(path, placeholder);
    }

    lastDismissedOffsetRef.current = null;
    setItems([]);
    setAnchorRect(null);
  }

  function fetchAndReplace(path: string, placeholder: string) {
    chrome.runtime
      .sendMessage({ type: "fetch-file-content", path })
      .then((response: FetchFileContentResponse) => {
        const range = adapter.findTextRange(placeholder);
        if (!range) return; // user already deleted the placeholder

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        if (response.ok) {
          const lang = getLanguageTag(path);
          adapter.injectText(
            `\`\`\`${lang}\n// ${path}\n${response.content}\n\`\`\``,
          );
        } else {
          adapter.injectText(
            `[couldn't fetch ${path}: ${ERROR_MESSAGES[response.error]}]`,
          );
        }
      });
  }

  useLayoutEffect(() => {
    adapter.onComposeChange(recompute);
    // Also recompute on pure selection movement (e.g. Cmd+A), which doesn't
    // fire a content-change event.
    document.addEventListener("selectionchange", recompute);

    const onKeyDown = (event: KeyboardEvent) => {
      if (itemsRef.current.length === 0) return;

      const box = adapter.findComposeBox();
      if (!box || !box.contains(document.activeElement)) {
        setItems([]);
        setAnchorRect(null);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismiss();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSelectedIndex((i) => Math.min(i + 1, itemsRef.current.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        // stopImmediatePropagation, not stopPropagation — otherwise the adapter's sibling send-detection listener still sees this Enter.
        event.stopImmediatePropagation();
        selectItem(selectedIndexRef.current);
      }
    };

    // Capture phase on document: the host page's own keydown handling would
    // otherwise beat a listener attached to the compose box directly.
    // useLayoutEffect, not useEffect — must register before mount.ts wires up send-detection.
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("selectionchange", recompute);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0 || !anchorRect) return null;

  // Flip upward if there isn't enough room below — e.g. once the compose
  // box is docked at the bottom of the page, opening downward would render
  // off-screen.
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const shouldFlip = spaceBelow < DROPDOWN_MAX_HEIGHT + GAP;
  const positionStyle = shouldFlip
    ? { bottom: `${window.innerHeight - anchorRect.top + GAP}px`, left: `${anchorRect.left}px` }
    : { top: `${anchorRect.bottom + GAP}px`, left: `${anchorRect.left}px` };

  return (
    <div
      class={`pulldeck-dropdown${shouldFlip ? " flipped" : ""}`}
      style={positionStyle}
    >
      {items.map((item, i) => {
        const runs = splitHighlightRuns(item.basename, item.matchedIndexes);

        return (
          <div
            key={item.path}
            class={`pulldeck-dropdown-item${i === selectedIndex ? " selected" : ""}`}
            onMouseEnter={() => setSelectedIndex(i)}
            onMouseDown={(event) => {
              event.preventDefault(); // keep focus in the compose box
              selectItem(i);
            }}
          >
            <img
              class="pulldeck-dropdown-item-icon"
              src={getFileIconUrl(item.path)}
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = getDefaultFileIconUrl();
              }}
              alt=""
            />
            <span class="pulldeck-dropdown-item-name">
              {runs.map((run, runIndex) =>
                run.matched ? <strong key={runIndex}>{run.text}</strong> : run.text,
              )}
            </span>
            <span class="pulldeck-dropdown-item-path">{item.path}</span>
          </div>
        );
      })}
    </div>
  );
}
