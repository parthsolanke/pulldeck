import { useEffect, useRef, useState } from "preact/hooks";
import {
  getSettings,
  getSettingsExpanded,
  saveSettings,
  setSettingsExpanded,
  type PatternMode,
  type PulldeckSettings,
} from "../lib/storage";
import { HARD_MAX_FILE_SIZE_BYTES, MIN_MAX_FILE_SIZE_BYTES, clampMaxFileSize } from "../lib/config";
import { formatBytes } from "../lib/format-bytes";
import { CustomSelect } from "./CustomSelect";

// Log-scale track — equal track distance means equal multiplicative KB change, so small files get more resolution.
const TRACK_STEPS = 1000;
const MIN_SIZE_KB = MIN_MAX_FILE_SIZE_BYTES / 1024;
const MAX_SIZE_KB = HARD_MAX_FILE_SIZE_BYTES / 1024;
const LOG_RANGE = Math.log(MAX_SIZE_KB / MIN_SIZE_KB);
// The track's true floor is a 1 KB sanity clamp, not a useful label — shown as this instead.
const SCALE_FLOOR_LABEL_KB = 50;

type SizeUnit = "KB" | "MB";

const UNIT_OPTIONS = [
  { value: "KB" as SizeUnit, label: "KB" },
  { value: "MB" as SizeUnit, label: "MB" },
];

const MODE_OPTIONS = [
  { value: "exclude" as PatternMode, label: "Exclude" },
  { value: "include" as PatternMode, label: "Include" },
];

function trackToKb(t: number): number {
  return MIN_SIZE_KB * Math.exp((t / TRACK_STEPS) * LOG_RANGE);
}

function kbToTrack(kb: number): number {
  const clamped = Math.min(Math.max(kb, MIN_SIZE_KB), MAX_SIZE_KB);
  return TRACK_STEPS * (Math.log(clamped / MIN_SIZE_KB) / LOG_RANGE);
}

// The unit only changes how the current value is displayed, not the slider's underlying scale.
function formatSize(kb: number, unit: SizeUnit): string {
  if (unit === "KB") return `${Math.round(kb)} KB`;
  return `${Number((kb / 1024).toFixed(2))} MB`;
}

function parsePatterns(text: string): string[] {
  return [...new Set(text.split(",").map((p) => p.trim()).filter((p) => p.length > 0))];
}

export function Settings() {
  const [trackValue, setTrackValue] = useState(kbToTrack(200));
  const [unit, setUnit] = useState<SizeUnit>("KB");
  const [patternText, setPatternText] = useState("");
  const [patternMode, setPatternMode] = useState<PatternMode>("exclude");
  const [savedFlash, setSavedFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"unit" | "mode" | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const flashTimeoutRef = useRef<number | undefined>(undefined);
  const trackValueRef = useRef(trackValue);
  trackValueRef.current = trackValue;
  const patternModeRef = useRef(patternMode);
  patternModeRef.current = patternMode;

  useEffect(() => {
    getSettings().then((settings) => {
      const kb = Math.round(settings.maxFileSizeBytes / 1024);
      setTrackValue(kbToTrack(kb));
      setUnit(kb >= 1024 ? "MB" : "KB");
      setPatternText(settings.filePatterns.join(", "));
      setPatternMode(settings.patternMode);
    });
    getSettingsExpanded().then(setExpanded);
  }, []);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    setSettingsExpanded(next);
  }

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setSavedFlash(false), 1500);
  }

  function persist(next: Partial<PulldeckSettings>) {
    const maxFileSizeBytes = clampMaxFileSize(
      next.maxFileSizeBytes ?? Math.round(trackToKb(trackValueRef.current)) * 1024,
    );
    const filePatterns = next.filePatterns ?? parsePatterns(patternText);
    const patternMode = next.patternMode ?? patternModeRef.current;
    saveSettings({ maxFileSizeBytes, filePatterns, patternMode }).then(flashSaved);
  }

  function handleSliderInput(e: Event) {
    const t = Number((e.target as HTMLInputElement).value);
    setTrackValue(t);
    // Debounced — dragging fires many input events; this settles into one write.
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      persist({ maxFileSizeBytes: Math.round(trackToKb(t)) * 1024 });
    }, 300);
  }

  function commitPatterns() {
    const filePatterns = parsePatterns(patternText);
    setPatternText(filePatterns.join(", "));
    persist({ filePatterns });
  }

  // Excluding lockfiles and including only lockfiles are unrelated lists — carrying one
  // over as the other is more likely to hide everything than to be useful. Matches
  // gitingest's own changePattern(), which clears its pattern field the same way.
  function handleModeChange(mode: PatternMode) {
    setPatternMode(mode);
    setPatternText("");
    persist({ patternMode: mode, filePatterns: [] });
  }

  const maxSizeKb = Math.round(trackToKb(trackValue));
  const fillPercent = (trackValue / TRACK_STEPS) * 100;
  const patternCount = parsePatterns(patternText).length;
  const modeLabel = patternMode === "include" ? "Include" : "Exclude";
  const summary = `${formatSize(maxSizeKb, unit)} · ${modeLabel} ${patternCount} pattern${patternCount === 1 ? "" : "s"}`;

  return (
    <div class="settings">
      <button
        type="button"
        class="settings-heading"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span class="settings-heading-label">Settings</span>
        <span class="settings-heading-right">
          {!expanded && <span class="settings-summary">{summary}</span>}
          {savedFlash && (
            <span class="settings-saved" aria-live="polite">
              Saved
            </span>
          )}
          <svg
            class={`settings-chevron${expanded ? " expanded" : ""}`}
            viewBox="0 0 10 10"
            width="10"
            height="10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 4l3 3 3-3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>

      <div class={`settings-collapse${expanded ? " expanded" : ""}`}>
        <div class="settings-collapse-inner">
          <div class="settings-field">
            <div class="settings-field-header">
              <label class="settings-label" for="pd-max-size">
                Max file size
              </label>
              <span class="settings-value">{formatSize(maxSizeKb, unit)}</span>
            </div>
            <div class="settings-size-row">
              <CustomSelect
                value={unit}
                options={UNIT_OPTIONS}
                onChange={setUnit}
                open={openDropdown === "unit"}
                onOpenChange={(open) => setOpenDropdown(open ? "unit" : null)}
              />
              <input
                id="pd-max-size"
                class="settings-slider"
                type="range"
                min={0}
                max={TRACK_STEPS}
                step={1}
                value={trackValue}
                onInput={handleSliderInput}
                style={{
                  background: `linear-gradient(to right, var(--pd-accent) ${fillPercent}%, var(--pd-border) ${fillPercent}%)`,
                }}
              />
            </div>
            <div class="settings-slider-scale">
              <span>{SCALE_FLOOR_LABEL_KB} KB</span>
              <span>Hard limit {formatBytes(HARD_MAX_FILE_SIZE_BYTES)}</span>
            </div>
          </div>

          <div class="settings-field">
            <div class="settings-exclude-row">
              <CustomSelect
                value={patternMode}
                options={MODE_OPTIONS}
                onChange={handleModeChange}
                open={openDropdown === "mode"}
                onOpenChange={(open) => setOpenDropdown(open ? "mode" : null)}
                merged
              />
              <input
                class="settings-exclude-input"
                type="text"
                placeholder={
                  patternMode === "include" ? "src/, *.ts" : "*.min.js, package-lock.json"
                }
                value={patternText}
                onInput={(e) => setPatternText((e.target as HTMLInputElement).value)}
                onBlur={commitPatterns}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
