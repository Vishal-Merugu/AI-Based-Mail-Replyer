// Color tokens. Light/dark values are themed; status/categorical values are
// fixed (used identically in both modes) per the validated reference palette.

export const lightTokens = {
  primary: "#2a78d6",
  background: "#f9f9f7",
  surface: "#fcfcfb",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  divider: "#e1e0d9",
};

export const darkTokens = {
  primary: "#3987e5",
  background: "#0d0d0d",
  surface: "#1a1a19",
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  divider: "#2c2c2a",
};

// Fixed status palette — never themed, reserved for state, never reused as a
// generic series color.
export const statusColors = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// First categorical slot, used here as an "informational" accent (distinct
// from the four reserved status roles above).
export const infoColor = "#2a78d6";
