import { useEffect, useRef, useState } from "preact/hooks";
import { Funnel, Gauge, Monitor, Moon, Plus, Sun, X } from "lucide-preact";
import {
  getSettings,
  saveSettings,
  type PatternMode,
  type PulldeckSettings,
  type ThemeMode,
} from "../lib/storage";
import { HARD_MAX_FILE_SIZE_BYTES, MIN_MAX_FILE_SIZE_BYTES, clampMaxFileSize } from "../lib/config";
import { formatBytes } from "../lib/format-bytes";

// Log-scale track — equal track distance means equal multiplicative KB change, so small files get more resolution.
const TRACK_STEPS = 1000;
const MIN_SIZE_KB = MIN_MAX_FILE_SIZE_BYTES / 1024;
const MAX_SIZE_KB = HARD_MAX_FILE_SIZE_BYTES / 1024;
const LOG_RANGE = Math.log(MAX_SIZE_KB / MIN_SIZE_KB);
// The track's true floor is a 1 KB sanity clamp, not a useful label — shown as this instead.
const SCALE_FLOOR_LABEL_KB = 50;

function trackToKb(t: number): number {
  return MIN_SIZE_KB * Math.exp((t / TRACK_STEPS) * LOG_RANGE);
}

function kbToTrack(kb: number): number {
  const clamped = Math.min(Math.max(kb, MIN_SIZE_KB), MAX_SIZE_KB);
  return TRACK_STEPS * (Math.log(clamped / MIN_SIZE_KB) / LOG_RANGE);
}

// Split into value/unit, not one string, so they can carry different type weight in CSS.
function formatSize(kb: number): { value: string; unit: string } {
  if (kb >= 1024) return { value: `${Number((kb / 1024).toFixed(2))}`, unit: "MB" };
  return { value: `${Math.round(kb)}`, unit: "KB" };
}

interface SettingsProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function Settings({ theme, onThemeChange }: SettingsProps) {
  const [trackValue, setTrackValue] = useState(kbToTrack(200));
  const [patterns, setPatterns] = useState<string[]>([]);
  const [addingPattern, setAddingPattern] = useState(false);
  const [newPatternText, setNewPatternText] = useState("");
  const [patternMode, setPatternMode] = useState<PatternMode>("exclude");
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const flashTimeoutRef = useRef<number | undefined>(undefined);
  const newPatternInputRef = useRef<HTMLInputElement>(null);
  const trackValueRef = useRef(trackValue);
  trackValueRef.current = trackValue;
  const patternsRef = useRef(patterns);
  patternsRef.current = patterns;
  const patternModeRef = useRef(patternMode);
  patternModeRef.current = patternMode;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    getSettings().then((settings) => {
      setTrackValue(kbToTrack(Math.round(settings.maxFileSizeBytes / 1024)));
      setPatterns(settings.filePatterns);
      setPatternMode(settings.patternMode);
    });
  }, []);

  useEffect(() => {
    if (addingPattern) newPatternInputRef.current?.focus();
  }, [addingPattern]);

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setSavedFlash(false), 1500);
  }

  function persist(next: Partial<PulldeckSettings>) {
    const maxFileSizeBytes = clampMaxFileSize(
      next.maxFileSizeBytes ?? Math.round(trackToKb(trackValueRef.current)) * 1024,
    );
    const filePatterns = next.filePatterns ?? patternsRef.current;
    const patternMode = next.patternMode ?? patternModeRef.current;
    const themeToSave = next.theme ?? themeRef.current;
    saveSettings({ maxFileSizeBytes, filePatterns, patternMode, theme: themeToSave }).then(flashSaved);
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

  function addPattern(raw: string) {
    const trimmed = raw.trim();
    setAddingPattern(false);
    setNewPatternText("");
    if (!trimmed) return;
    const next = [...new Set([...patternsRef.current, trimmed])];
    setPatterns(next);
    persist({ filePatterns: next });
  }

  function removePattern(pattern: string) {
    const next = patternsRef.current.filter((p) => p !== pattern);
    setPatterns(next);
    persist({ filePatterns: next });
  }

  function cancelAddPattern() {
    setAddingPattern(false);
    setNewPatternText("");
  }

  // Excluding lockfiles and including only lockfiles are unrelated lists — carrying one
  // over as the other is more likely to hide everything than to be useful. Matches
  // gitingest's own changePattern(), which clears its pattern field the same way.
  function handleModeChange(mode: PatternMode) {
    setPatternMode(mode);
    setPatterns([]);
    persist({ patternMode: mode, filePatterns: [] });
  }

  function handleThemeChange(mode: ThemeMode) {
    onThemeChange(mode);
    persist({ theme: mode });
  }

  const maxSizeKb = Math.round(trackToKb(trackValue));
  const fillPercent = (trackValue / TRACK_STEPS) * 100;
  const size = formatSize(maxSizeKb);

  return (
    <>
      <div class="screen-header">
        <div class="screen-title-row">
          <h1 class="screen-title">Settings</h1>
          {savedFlash && (
            <span class="header-saved" aria-live="polite">
              Saved
            </span>
          )}
        </div>
        <div class="toggle-group">
          <button
            type="button"
            class={`toggle-btn icon${theme === "system" ? " active" : ""}`}
            onClick={() => handleThemeChange("system")}
            aria-label="Match system"
            title="Match system"
          >
            <Monitor size={13} />
          </button>
          <button
            type="button"
            class={`toggle-btn icon${theme === "light" ? " active" : ""}`}
            onClick={() => handleThemeChange("light")}
            aria-label="Light"
            title="Light"
          >
            <Sun size={13} />
          </button>
          <button
            type="button"
            class={`toggle-btn icon${theme === "dark" ? " active" : ""}`}
            onClick={() => handleThemeChange("dark")}
            aria-label="Dark"
            title="Dark"
          >
            <Moon size={13} />
          </button>
        </div>
      </div>

      <div class="settings-body">
        <div class="settings-field">
          <div class="field-head">
            <span class="field-icon">
              <Gauge size={15} />
            </span>
            <div style={{ flex: 1 }}>
              <label class="settings-label" for="pd-max-size">
                Max file size
              </label>
              <div class="field-helper">Files larger than this are skipped when tagging.</div>
            </div>
          </div>
          <div class="settings-value-big">
            {size.value}
            <span class="settings-value-unit">{size.unit}</span>
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
              // Identical stops: a hard cut between two flat fills, not a blend — the standard way to fill a range track.
              background: `linear-gradient(to right, var(--pd-accent) ${fillPercent}%, var(--pd-border) ${fillPercent}%)`, // taste-skill-ignore
            }}
          />
          <div class="settings-slider-scale">
            <span>{SCALE_FLOOR_LABEL_KB} KB</span>
            <span>Hard limit {formatBytes(HARD_MAX_FILE_SIZE_BYTES)}</span>
          </div>
        </div>

        <div class="settings-field">
          <div class="field-head">
            <span class="field-icon">
              <Funnel size={15} />
            </span>
            <div>
              <h2 class="settings-label">Pattern filter</h2>
              <div class="field-helper">Choose which files to include or exclude by pattern.</div>
            </div>
          </div>
          <div class="toggle-group" style={{ marginTop: "10px" }}>
            <button
              type="button"
              class={`toggle-btn${patternMode === "exclude" ? " active" : ""}`}
              onClick={() => handleModeChange("exclude")}
            >
              Exclude
            </button>
            <button
              type="button"
              class={`toggle-btn${patternMode === "include" ? " active" : ""}`}
              onClick={() => handleModeChange("include")}
            >
              Include
            </button>
          </div>
          <div class="pattern-row">
            {patterns.map((pattern) => (
              <span key={pattern} class="pattern-chip">
                {pattern}
                <button type="button" onClick={() => removePattern(pattern)} aria-label={`Remove ${pattern}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
            {addingPattern ? (
              <input
                ref={newPatternInputRef}
                class="pattern-input"
                placeholder={patternMode === "include" ? "src/" : "*.min.js"}
                value={newPatternText}
                onInput={(e) => setNewPatternText((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPattern(newPatternText);
                  else if (e.key === "Escape") cancelAddPattern();
                }}
                onBlur={cancelAddPattern}
              />
            ) : (
              <button type="button" class="add-pattern-chip" onClick={() => setAddingPattern(true)}>
                <Plus size={11} />
                pattern
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
