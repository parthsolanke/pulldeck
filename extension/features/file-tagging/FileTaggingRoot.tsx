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
const TOOLTIP_HEIGHT_ESTIMATE = 32;
const TOOLTIP_DELAY_MS = 400;

// Fixed conservative estimate for "+N", not exact per-digit measurement — widened to comfortably fit double-digit counts.
const OVERFLOW_PILL_WIDTH_ESTIMATE = 64;
const OVERFLOW_POPOVER_SHOW_DELAY_MS = 220;
const OVERFLOW_POPOVER_CLOSE_GRACE_MS = 200;
const TOOLTIP_SIDE_WIDTH_ESTIMATE = 280;

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

// Iterates backward from the newest chip, greedily including as many as fit — implements
// "newest stays visible, oldest folds first," and always keeps at least one chip visible.
function computeVisibleCount(widths: number[], availableWidth: number): number {
  if (widths.length === 0) return 0;

  const totalWidth = widths.reduce((a, b) => a + b, 0) + GAP * (widths.length - 1);
  if (totalWidth <= availableWidth) return widths.length;

  const budget = availableWidth - (OVERFLOW_PILL_WIDTH_ESTIMATE + GAP);
  let used = 0;
  let count = 0;
  for (let i = widths.length - 1; i >= 0; i--) {
    if (count === 0) {
      used = widths[i];
      count = 1;
      continue;
    }
    const next = used + widths[i] + GAP;
    if (next > budget) break;
    used = next;
    count++;
  }
  return count;
}

type ActiveTag = ReturnType<PlatformAdapter["getActiveTag"]>;
type TooltipMode = "tray" | "popover";

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
  const [hoveredTag, setHoveredTag] = useState<
    { path: string; rect: DOMRect; mode: TooltipMode } | null
  >(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowPillRect, setOverflowPillRect] = useState<DOMRect | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const overflowPopoverRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | undefined>(undefined);
  const overflowShowTimeoutRef = useRef<number | undefined>(undefined);
  const overflowHideTimeoutRef = useRef<number | undefined>(undefined);

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

  // overflowTags is already oldest-first (array push-order) — matches the popover's own reading order.
  const visibleTags = pendingTags.slice(Math.max(0, pendingTags.length - visibleCount));
  const overflowTags = pendingTags.slice(0, Math.max(0, pendingTags.length - visibleCount));

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
      adapter.injectText(`[can't preview binary file: ${path}] `);
    } else {
      // Random suffix keeps the placeholder findable even after further edits.
      const id = Math.random().toString(36).slice(2, 8);
      const placeholder = `#${item.basename}·${id}`;
      // Trailing space only in what's injected, not in the tracked placeholder — so
      // removal/swap-at-send still matches just the tag text, leaving the space in place.
      adapter.injectText(`${placeholder} `);
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
      // execCommand, not injectText("") — ProseMirror ignores a paste carrying empty content, leaving the placeholder behind.
      document.execCommand("delete");
    }
    setPendingTags((tags) => tags.filter((t) => t.id !== tag.id));
    // Otherwise removing a chip via its own hovered remove-× leaves a stale tooltip open.
    setHoveredTag((current) => (current?.path === tag.path ? null : current));
  }

  // Delayed show, immediate hide — avoids a flash of tooltip on every incidental mouse pass.
  function handleChipMouseEnter(tag: PendingTag, event: MouseEvent, mode: TooltipMode = "tray") {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (tooltipTimeoutRef.current) window.clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setHoveredTag({ path: tag.path, rect, mode });
    }, TOOLTIP_DELAY_MS);
  }

  function handleChipMouseLeave() {
    if (tooltipTimeoutRef.current) window.clearTimeout(tooltipTimeoutRef.current);
    setHoveredTag(null);
  }

  // Pill + popover count as one hover region: entering either cancels a pending close, and
  // re-entering while already open is a no-op so it doesn't restart the show delay.
  function handleOverflowMouseEnter(event: MouseEvent) {
    if (overflowHideTimeoutRef.current) {
      window.clearTimeout(overflowHideTimeoutRef.current);
      overflowHideTimeoutRef.current = undefined;
    }
    if (overflowOpen) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (overflowShowTimeoutRef.current) window.clearTimeout(overflowShowTimeoutRef.current);
    overflowShowTimeoutRef.current = window.setTimeout(() => {
      setOverflowPillRect(rect);
      setOverflowOpen(true);
    }, OVERFLOW_POPOVER_SHOW_DELAY_MS);
  }

  // Grace period, not instant — covers the travel from the pill up into the popover.
  function handleOverflowMouseLeave() {
    if (overflowShowTimeoutRef.current) window.clearTimeout(overflowShowTimeoutRef.current);
    if (overflowHideTimeoutRef.current) window.clearTimeout(overflowHideTimeoutRef.current);
    overflowHideTimeoutRef.current = window.setTimeout(() => setOverflowOpen(false), OVERFLOW_POPOVER_CLOSE_GRACE_MS);
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

  // Runs before paint: measures the hidden row's real chip widths and corrects visibleCount in
  // the same tick, so the browser only ever paints the final split, never an intermediate one.
  useLayoutEffect(() => {
    if (pendingTags.length === 0) {
      if (visibleCount !== 0) setVisibleCount(0);
      return;
    }
    const container = measureContainerRef.current;
    if (!container) return;
    const widths = Array.from(container.children).map(
      (el) => (el as HTMLElement).getBoundingClientRect().width,
    );
    setVisibleCount(computeVisibleCount(widths, trayRect?.width ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTags, trayRect]);

  // A removal can shift the visible/overflow boundary, un-folding a chip whose tooltip is
  // showing with a now-stale captured rect — drop it rather than leave it floating disconnected.
  useLayoutEffect(() => {
    if (!hoveredTag) return;
    const stillPresent =
      hoveredTag.mode === "tray"
        ? visibleTags.some((t) => t.path === hoveredTag.path)
        : overflowTags.some((t) => t.path === hoveredTag.path);
    if (!stillPresent) setHoveredTag(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTags, visibleCount]);

  // Unconditional — fires even while still hovered, matching "auto-close once empty" literally.
  useLayoutEffect(() => {
    if (overflowTags.length === 0 && overflowOpen) {
      if (overflowHideTimeoutRef.current) window.clearTimeout(overflowHideTimeoutRef.current);
      if (overflowShowTimeoutRef.current) window.clearTimeout(overflowShowTimeoutRef.current);
      setOverflowOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflowTags.length, overflowOpen]);

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

  function renderChip(tag: PendingTag, opts: { mode: TooltipMode; className?: string }) {
    const extraClass = opts.className ? ` ${opts.className}` : "";
    return (
      <div
        key={tag.id}
        class={`pulldeck-file-chip${tag.status === "error" ? " error" : ""}${extraClass}`}
        onMouseEnter={(event) => handleChipMouseEnter(tag, event, opts.mode)}
        onMouseLeave={handleChipMouseLeave}
      >
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
    );
  }

  // Off-screen; exists purely so real chip widths can be measured before the visible split is decided.
  const measureRow =
    pendingTags.length > 0 ? (
      <div ref={measureContainerRef} class="pulldeck-file-tray-measure" aria-hidden="true">
        {pendingTags.map((tag) => renderChip(tag, { mode: "tray" }))}
      </div>
    ) : null;

  let tray = null;
  if (pendingTags.length > 0 && trayRect) {
    const shouldFlipBelow = trayRect.top < TRAY_HEIGHT_ESTIMATE + GAP;
    const positionStyle = shouldFlipBelow
      ? { top: `${trayRect.bottom + GAP}px`, left: `${trayRect.left}px` }
      : { bottom: `${window.innerHeight - trayRect.top + GAP}px`, left: `${trayRect.left}px` };

    tray = (
      <div class="pulldeck-file-tray" style={positionStyle}>
        {overflowTags.length > 0 && (
          <div
            class="pulldeck-file-chip pulldeck-file-overflow-pill"
            onMouseEnter={handleOverflowMouseEnter}
            onMouseLeave={handleOverflowMouseLeave}
          >
            <span class="pulldeck-file-chip-label">+{overflowTags.length}</span>
          </div>
        )}
        {visibleTags.map((tag) => renderChip(tag, { mode: "tray" }))}
      </div>
    );
  }

  let overflowPopover = null;
  if (overflowOpen && overflowTags.length > 0 && overflowPillRect) {
    // Opposite priority from the search dropdown: this pill usually sits right above the
    // compose box near the bottom of the screen, so opening upward is the common case.
    const spaceAbove = overflowPillRect.top;
    const opensBelow = spaceAbove < DROPDOWN_MAX_HEIGHT + GAP;
    const positionStyle = opensBelow
      ? { top: `${overflowPillRect.bottom + GAP}px`, left: `${overflowPillRect.left}px` }
      : { bottom: `${window.innerHeight - overflowPillRect.top + GAP}px`, left: `${overflowPillRect.left}px` };

    overflowPopover = (
      <div
        ref={overflowPopoverRef}
        class={`pulldeck-file-overflow-popover${opensBelow ? "" : " flipped"}`}
        style={positionStyle}
        onMouseEnter={handleOverflowMouseEnter}
        onMouseLeave={handleOverflowMouseLeave}
      >
        {overflowTags.map((tag) =>
          renderChip(tag, { mode: "popover", className: "pulldeck-file-overflow-item" }),
        )}
      </div>
    );
  }

  let tooltip = null;
  if (hoveredTag) {
    if (hoveredTag.mode === "tray") {
      const shouldFlipBelow = hoveredTag.rect.top < TOOLTIP_HEIGHT_ESTIMATE + GAP;
      const centerX = hoveredTag.rect.left + hoveredTag.rect.width / 2;
      const positionStyle = shouldFlipBelow
        ? { top: `${hoveredTag.rect.bottom + GAP}px`, left: `${centerX}px` }
        : { bottom: `${window.innerHeight - hoveredTag.rect.top + GAP}px`, left: `${centerX}px` };

      tooltip = (
        <div
          class={`pulldeck-file-chip-tooltip${shouldFlipBelow ? " flipped" : ""}`}
          style={positionStyle}
        >
          {hoveredTag.path}
        </div>
      );
    } else {
      // Side placement, not above/below — a vertical list has neighbors directly above and
      // below where the tray's own flip axis would collide with sibling rows.
      // Anchored to the popover's own edge, not the chip's — a short chip's own edge now sits inside the popover, not outside it.
      const popoverEdge = overflowPopoverRef.current?.getBoundingClientRect();
      const rightEdge = popoverEdge?.right ?? hoveredTag.rect.right;
      const leftEdge = popoverEdge?.left ?? hoveredTag.rect.left;
      const centerY = hoveredTag.rect.top + hoveredTag.rect.height / 2;
      const shouldFlipLeft = window.innerWidth - rightEdge < TOOLTIP_SIDE_WIDTH_ESTIMATE + GAP;
      const positionStyle = shouldFlipLeft
        ? { top: `${centerY}px`, right: `${window.innerWidth - leftEdge + GAP}px` }
        : { top: `${centerY}px`, left: `${rightEdge + GAP}px` };

      tooltip = (
        <div
          class={`pulldeck-file-chip-tooltip pulldeck-file-chip-tooltip-side${shouldFlipLeft ? " flipped-left" : ""}`}
          style={positionStyle}
        >
          {hoveredTag.path}
        </div>
      );
    }
  }

  return (
    <>
      {measureRow}
      {tray}
      {overflowPopover}
      {dropdown}
      {tooltip}
    </>
  );
}
