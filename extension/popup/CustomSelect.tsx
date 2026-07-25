import { useEffect, useRef, useState } from "preact/hooks";

const GAP = 6;
// Rough height for a couple of option rows plus padding — doesn't need to be exact.
const MENU_HEIGHT_ESTIMATE = 90;

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // No border/radius of its own — sits flush against a sibling's shared border instead.
  merged?: boolean;
}

// Not a native <select> — the OS renders a native select's open menu itself
// (platform-styled, can't be restyled to match the app), so this is a real
// popover instead, styled with our own tokens like everything else here.
export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  open,
  onOpenChange,
  merged,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [positionStyle, setPositionStyle] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!open) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // The popup window doesn't grow to fit a position:fixed menu — flip
      // upward when there isn't room below, same as the content script's
      // own dropdown, or the menu can render past the popup's own edge.
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensAbove = spaceBelow < MENU_HEIGHT_ESTIMATE + GAP;
      setPositionStyle(
        opensAbove
          ? {
              bottom: `${window.innerHeight - rect.top + GAP}px`,
              left: `${rect.left}px`,
              minWidth: `${rect.width}px`,
            }
          : {
              top: `${rect.bottom + GAP}px`,
              left: `${rect.left}px`,
              minWidth: `${rect.width}px`,
            },
      );
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function handleScroll() {
      onOpenChange(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const selected = options.find((option) => option.value === value);

  return (
    <div class="pd-select" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        class={`pd-select-trigger${merged ? " merged" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span class="pd-select-trigger-label">{selected?.label}</span>
        <svg
          class={`pd-select-chevron${open ? " expanded" : ""}`}
          viewBox="0 0 10 10"
          width="10"
          height="10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      {open && positionStyle && (
        <div class="pd-select-menu" role="listbox" style={positionStyle}>
          {options.map((option) => (
            <div
              key={option.value}
              class={`pd-select-option${option.value === value ? " selected" : ""}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
            >
              <span>{option.label}</span>
              <svg class="pd-select-check" viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
