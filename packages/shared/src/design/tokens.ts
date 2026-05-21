export const colors = {
  background: "#111317",
  surface: "#111317",
  "surface-container": "#1e2024",
  "surface-container-low": "#1a1c20",
  "surface-container-lowest": "#0c0e12",
  "surface-container-high": "#282a2e",
  "surface-container-highest": "#333539",
  "surface-bright": "#37393e",
  "surface-variant": "#333539",
  "surface-dim": "#111317",
  "surface-tint": "#00dbe9",

  primary: "#dbfcff",
  "primary-fixed": "#7df4ff",
  "primary-fixed-dim": "#00dbe9",
  "primary-container": "#00f0ff",
  "on-primary": "#00363a",
  "on-primary-fixed": "#002022",
  "on-primary-fixed-variant": "#004f54",
  "on-primary-container": "#006970",
  "inverse-primary": "#006970",

  secondary: "#ffffff",
  "secondary-fixed": "#36ffc4",
  "secondary-fixed-dim": "#00e1ab",
  "secondary-container": "#36ffc4",
  "on-secondary": "#003828",
  "on-secondary-fixed": "#002116",
  "on-secondary-fixed-variant": "#00513c",
  "on-secondary-container": "#007255",

  tertiary: "#faf3ff",
  "tertiary-fixed": "#e9ddff",
  "tertiary-fixed-dim": "#d1bcff",
  "tertiary-container": "#e1d2ff",
  "on-tertiary": "#3c0090",
  "on-tertiary-fixed": "#23005b",
  "on-tertiary-fixed-variant": "#5700c9",
  "on-tertiary-container": "#7213ff",

  "on-background": "#e2e2e8",
  "on-surface": "#e2e2e8",
  "on-surface-variant": "#b9cacb",
  "inverse-on-surface": "#2f3035",
  "inverse-surface": "#e2e2e8",

  outline: "#849495",
  "outline-variant": "#3b494b",

  error: "#ffb4ab",
  "error-container": "#93000a",
  "on-error": "#690005",
  "on-error-container": "#ffdad6",
};

export const spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  gutter: 16,
  md: 24,
  lg: 40,
  xl: 64,
  "margin-mobile": 20,
  "margin-desktop": 48,
};

export const borderRadius = {
  DEFAULT: 4,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const typography = {
  "display-lg": { fontSize: 48, lineHeight: 56, fontWeight: "700", letterSpacing: -0.02 },
  "headline-lg": { fontSize: 32, lineHeight: 40, fontWeight: "600", letterSpacing: -0.01 },
  "headline-lg-mobile": { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  "headline-md": { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  "body-lg": { fontSize: 18, lineHeight: 28, fontWeight: "400" },
  "body-md": { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  "mono-data": { fontSize: 14, lineHeight: 20, fontWeight: "700", letterSpacing: 0.02 },
  "label-md": { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.05 },
  "label-sm": { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.1 },
};

export const fontFamily = {
  sans: "Sora",
  mono: "Sora",
};

export const glassStyle = {
  backgroundColor: "rgba(30, 32, 36, 0.6)",
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderTopColor: "rgba(255,255,255,0.1)",
  borderLeftColor: "rgba(255,255,255,0.1)",
  borderRightColor: "rgba(0,0,0,0.2)",
  borderBottomColor: "rgba(0,0,0,0.2)",
  borderRightWidth: 1,
  borderBottomWidth: 1,
} as const;
