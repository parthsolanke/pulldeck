import { useEffect, useRef, useState } from "preact/hooks";
import { getSettings, saveSettings, type PatternMode, type PulldeckSettings } from "../lib/storage";
import { HARD_MAX_FILE_SIZE_BYTES, MIN_MAX_FILE_SIZE_BYTES, clampMaxFileSize } from "../lib/config";
import { formatBytes } from "../lib/format-bytes";

// A continuous log-scale track instead of fixed stops — equal distance on
// the track means an equal multiplicative change in KB, so dragging feels
// smooth everywhere while still giving the common 50–500 KB range far more
// resolution than the rarely-used upper end.
const TRACK_STEPS = 1000;
const MIN_SIZE_KB = MIN_MAX_FILE_SIZE_BYTES / 1024;
const MAX_SIZE_KB = HARD_MAX_FILE_SIZE_BYTES / 1024;
const LOG_RANGE = Math.log(MAX_SIZE_KB / MIN_SIZE_KB);
// The track's true floor is 1 KB (MIN_MAX_FILE_SIZE_BYTES, a sanity clamp,
// not a useful orientation point) — the scale label shows a more sensible
// anchor instead, without changing how far left the thumb can actually go.
const SCALE_FLOOR_LABEL_KB = 50;

function trackToKb(t: number): number {
  return MIN_SIZE_KB * Math.exp((t / TRACK_STEPS) * LOG_RANGE);
}

function kbToTrack(kb: number): number {
  const clamped = Math.min(Math.max(kb, MIN_SIZE_KB), MAX_SIZE_KB);
  return TRACK_STEPS * (Math.log(clamped / MIN_SIZE_KB) / LOG_RANGE);
}

function parsePatterns(text: string): string[] {
  return [...new Set(text.split(",").map((p) => p.trim()).filter((p) => p.length > 0))];
}

export function Settings() {
  const [trackValue, setTrackValue] = useState(kbToTrack(200));
  const [patternText, setPatternText] = useState("");
  const [patternMode, setPatternMode] = useState<PatternMode>("exclude");
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const flashTimeoutRef = useRef<number | undefined>(undefined);
  const trackValueRef = useRef(trackValue);
  trackValueRef.current = trackValue;
  const patternModeRef = useRef(patternMode);
  patternModeRef.current = patternMode;

  useEffect(() => {
    getSettings().then((settings) => {
      setTrackValue(kbToTrack(Math.round(settings.maxFileSizeBytes / 1024)));
      setPatternText(settings.filePatterns.join(", "));
      setPatternMode(settings.patternMode);
    });
  }, []);

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
    // Debounced, not saved on every tick — dragging fires many input events;
    // this settles into one write shortly after the drag stops.
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

  function handleModeChange(e: Event) {
    const mode = (e.target as HTMLSelectElement).value as PatternMode;
    setPatternMode(mode);
    persist({ patternMode: mode });
  }

  const maxSizeKb = Math.round(trackToKb(trackValue));
  const fillPercent = (trackValue / TRACK_STEPS) * 100;

  return (
    <div class="settings">
      <div class="settings-heading">
        <span class="settings-heading-label">File tagging</span>
        {savedFlash && <span class="settings-saved">Saved</span>}
      </div>

      <div class="settings-field">
        <div class="settings-field-header">
          <label class="settings-label" for="pd-max-size">
            Max file size
          </label>
          <span class="settings-value">{maxSizeKb} KB</span>
        </div>
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
        <div class="settings-slider-scale">
          <span>{SCALE_FLOOR_LABEL_KB} KB</span>
          <span>Hard limit {formatBytes(HARD_MAX_FILE_SIZE_BYTES)}</span>
        </div>
      </div>

      <div class="settings-field">
        <div class="settings-exclude-row">
          <select class="settings-exclude-mode" value={patternMode} onChange={handleModeChange}>
            <option value="exclude">Exclude</option>
            <option value="include">Include</option>
          </select>
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
  );
}
