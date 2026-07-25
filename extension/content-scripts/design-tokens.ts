// Shared CSS custom properties for anything we inject into the page (the
// file-tagging dropdown, the fail banner). Kept in one place so both stay
// visually consistent instead of drifting apart.

export const DESIGN_TOKENS_LIGHT = `
  --pd-accent: #6336f9;
  --pd-radius: 10px;
  --pd-bg: #ffffff;
  --pd-border: rgba(15, 22, 36, 0.1);
  --pd-text: rgba(29, 30, 32, 0.95);
  --pd-hover-bg: rgba(98, 41, 255, 0.08);
  --pd-chip-bg: rgba(222, 219, 255, 1);
  --pd-chip-border: rgba(157, 138, 255, 1);
  --pd-chip-text: rgba(56, 0, 153, 1);
  --pd-accent-soft: #8a6bff;
  --pd-shadow:
    0px 16px 48px 0px rgba(17, 24, 39, 0.04),
    0px 12px 24px 0px rgba(17, 24, 39, 0.04),
    0px 6px 8px 0px rgba(17, 24, 39, 0.02),
    0px 2px 3px 0px rgba(17, 24, 39, 0.02);
`;

export const DESIGN_TOKENS_DARK = `
  --pd-bg: rgba(25, 25, 26, 1);
  --pd-border: rgba(238, 238, 246, 0.11);
  --pd-text: rgba(245, 245, 245, 0.96);
  --pd-hover-bg: rgba(122, 82, 255, 0.16);
  --pd-chip-bg: rgba(43, 25, 102, 1);
  --pd-chip-border: rgba(75, 0, 204, 1);
  --pd-chip-text: rgba(195, 189, 255, 1);
  --pd-accent-soft: #9c82ff;
  --pd-shadow:
    0px 16px 48px 0px rgba(0, 0, 0, 0.5),
    0px 12px 24px 0px rgba(0, 0, 0, 0.24),
    0px 6px 8px 0px rgba(0, 0, 0, 0.22),
    0px 2px 3px 0px rgba(0, 0, 0, 0.12);
`;
