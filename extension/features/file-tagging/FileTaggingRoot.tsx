import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { PlatformAdapter } from "../../content-scripts/adapters/adapter.interface";
import type { FetchFileContentResponse } from "../../background/service-worker";
import { searchFiles, type FileMatch } from "./search";
import { DROPDOWN_MAX_HEIGHT } from "./styles";
import { isBinaryFile, getExtension, getLanguageTag } from "./file-format";
import { getFileIconUrl, getDefaultFileIconUrl } from "./file-icons";
import { splitHighlightRuns } from "./highlight";
import { formatBytes } from "../../lib/format-bytes";
import { processNotebook } from "./notebook";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "file not found",
  rate_limited: "rate limited, try again later",
  no_active_repo: "no repo connected",
  unknown: "something went wrong",
  binary: "file appears to be binary",
};

function formatFetchError(response: FetchFileContentResponse & { ok: false }): string {
  if (response.error === "too_large") {
    return `file too large (${formatBytes(response.actualSize)}, limit is ${formatBytes(response.maxSize)})`;
  }
  return ERROR_MESSAGES[response.error];
}

const GAP = 4;

// Rough height for the above/below flip check — doesn't need to be exact.
const TRAY_HEIGHT_ESTIMATE = 40;

// Editors re-sync selection from a native selectionchange event, which fires
// async — dispatching it manually forces the sync before injectText() runs.
function selectRange(range: Range): void {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

// Field-by-field, not object identity — getBoundingClientRect() returns a fresh DOMRect every call.
function rectsEqual(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

type ActiveTag = ReturnType<PlatformAdapter["getActiveTag"]>;

// A tag whose marker is in the compose box; real content swaps in at send time.
interface PendingTag {
  id: string;
  placeholder: string;
  basename: string;
  path: string;
  status: "loading" | "ready" | "error";
  resolvedText: string | null;
}

interface Props {
  adapter: PlatformAdapter;
}

export function FileTaggingRoot({ adapter }: Props) {
  const [items, setItems] = useState<FileMatch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [pendingTags, setPendingTags] = useState<PendingTag[]>([]);
  const [trayRect, setTrayRect] = useState<DOMRect | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Mirrored in refs so the keydown listener below (registered once) always
  // reads fresh values instead of closing over stale ones.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const pendingTagsRef = useRef(pendingTags);
  pendingTagsRef.current = pendingTags;
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

    selectRange(activeTag.range);

    if (isBinaryFile(path)) {
      adapter.injectText(`[can't preview binary file: ${path}]`);
    } else {
      // Random suffix keeps the placeholder findable even after further edits.
      const id = Math.random().toString(36).slice(2, 8);
      const placeholder = `#${item.basename}·${id}`;
      adapter.injectText(placeholder);
      setPendingTags((tags) => [
        ...tags,
        { id, placeholder, basename: item.basename, path, status: "loading", resolvedText: null },
      ]);
      recomputeTrayPosition();
      fetchFileContent(path, id);
    }

    lastDismissedOffsetRef.current = null;
    setItems([]);
    setAnchorRect(null);
  }

  function fetchFileContent(path: string, id: string) {
    chrome.runtime
      .sendMessage({ type: "fetch-file-content", path })
      .then((response: FetchFileContentResponse) => {
        let resolvedText: string;
        if (response.ok) {
          const content =
            getExtension(path) === "ipynb" ? processNotebook(response.content) : response.content;
          resolvedText = `\`\`\`${getLanguageTag(path)}\n// ${path}\n${content}\n\`\`\``;
        } else {
          resolvedText = `[couldn't fetch ${path}: ${formatFetchError(response)}]`;
        }

        setPendingTags((tags) =>
          tags.map((tag) =>
            tag.id === id
              ? { ...tag, status: response.ok ? "ready" : "error", resolvedText }
              : tag,
          ),
        );
      });
  }

  // Anchored to the box's own edge, not text inside it, so it stays correct
  // even as content scrolls internally.
  function recomputeTrayPosition() {
    const box = adapter.findComposeBox();
    setTrayRect(box ? box.getBoundingClientRect() : null);
  }

  // Repositions without re-running the fuzzy search — a pure position drift has nothing new to search for.
  function repositionOnDrift() {
    if (itemsRef.current.length > 0) {
      setAnchorRect(adapter.getCaretRect());
    }
    if (pendingTagsRef.current.length > 0) {
      recomputeTrayPosition();
    }
  }

  // Drops tags whose placeholder text was deleted by the user.
  function pruneDeletedTags() {
    const stillPresent = pendingTagsRef.current.filter((tag) =>
      adapter.findTextRange(tag.placeholder),
    );
    if (stillPresent.length !== pendingTagsRef.current.length) {
      setPendingTags(stillPresent);
    }
  }

  function removeTag(tag: PendingTag) {
    const range = adapter.findTextRange(tag.placeholder);
    if (range) {
      selectRange(range);
      adapter.injectText("");
    }
    setPendingTags((tags) => tags.filter((t) => t.id !== tag.id));
  }

  // Runs on the same Enter/click that sends the message, before the platform
  // reads the text — swaps ready tags in place; still-loading ones send as-is.
  function swapPendingTagsBeforeSend() {
    // Dropdown open means this Enter/click is a selection, not a send.
    if (itemsRef.current.length > 0) return;

    for (const tag of pendingTagsRef.current) {
      if (!tag.resolvedText) continue;
      const range = adapter.findTextRange(tag.placeholder);
      if (!range) continue; // user deleted it

      selectRange(range);
      adapter.injectText(tag.resolvedText);
    }
    setPendingTags([]);
  }

  useLayoutEffect(() => {
    adapter.onComposeChange(recompute);
    // Also recompute on pure selection movement (e.g. Cmd+A), which doesn't
    // fire a content-change event.
    document.addEventListener("selectionchange", recompute);

    adapter.onComposeChange(pruneDeletedTags);

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

    // After onKeyDown — same-node capture order gives the dropdown first refusal.
    adapter.onBeforeSend(swapPendingTagsBeforeSend);

    return () => {
      document.removeEventListener("selectionchange", recompute);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polls — a sidebar toggle shifts the box's position without resizing it, which ResizeObserver misses.
  useLayoutEffect(() => {
    let lastRect = adapter.findComposeBox()?.getBoundingClientRect() ?? null;
    let rafId = requestAnimationFrame(tick);

    function tick() {
      const rect = adapter.findComposeBox()?.getBoundingClientRect() ?? null;
      if (!rectsEqual(rect, lastRect)) {
        lastRect = rect;
        repositionOnDrift();
      }
      rafId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrow-key navigation moves selectedIndex, but the browser has no idea a
  // row needs to stay in view — without this, the highlight can scroll past
  // the dropdown's visible edge while the list itself stays put.
  useLayoutEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, items]);

  // Renders independently of the dropdown so tags stay visible while typing.
  let dropdown = null;
  if (items.length > 0 && anchorRect) {
    // Flip upward if there isn't enough room below — e.g. once the compose
    // box is docked at the bottom of the page, opening downward would
    // render off-screen.
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const shouldFlip = spaceBelow < DROPDOWN_MAX_HEIGHT + GAP;
    const positionStyle = shouldFlip
      ? { bottom: `${window.innerHeight - anchorRect.top + GAP}px`, left: `${anchorRect.left}px` }
      : { top: `${anchorRect.bottom + GAP}px`, left: `${anchorRect.left}px` };

    dropdown = (
      <div
        ref={listRef}
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

  let tray = null;
  if (pendingTags.length > 0 && trayRect) {
    const shouldFlipBelow = trayRect.top < TRAY_HEIGHT_ESTIMATE + GAP;
    const positionStyle = shouldFlipBelow
      ? { top: `${trayRect.bottom + GAP}px`, left: `${trayRect.left}px` }
      : { bottom: `${window.innerHeight - trayRect.top + GAP}px`, left: `${trayRect.left}px` };

    tray = (
      <div class="pulldeck-file-tray" style={positionStyle}>
        {pendingTags.map((tag) => (
          <div key={tag.id} class={`pulldeck-file-chip${tag.status === "error" ? " error" : ""}`}>
            <span class="pulldeck-file-chip-icon">
              {tag.status === "loading" ? (
                <span class="pulldeck-file-chip-spinner" />
              ) : tag.status === "error" ? (
                <span class="pulldeck-file-chip-icon-visual">!</span>
              ) : (
                <img
                  class="pulldeck-file-chip-icon-visual"
                  src={getFileIconUrl(tag.path)}
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).src = getDefaultFileIconUrl();
                  }}
                  alt=""
                />
              )}
              <button
                type="button"
                class="pulldeck-file-chip-remove"
                aria-label={`Remove ${tag.basename}`}
                onMouseDown={(event) => event.preventDefault()} // keep focus in the compose box
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
            <span class="pulldeck-file-chip-label">{tag.basename}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {tray}
      {dropdown}
    </>
  );
}
