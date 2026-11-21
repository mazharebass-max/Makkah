export const colors = {
  midnight: "#0B1F3A",
  royal: "#1A5FBF",
  blue: "#1A5FBF",
  orange: "#F0771F",
  red: "#D62828",
  /** @deprecated prefer orange — kept for existing gold call sites */
  gold: "#F0771F",
  emerald: "#087F6D",
  sand: "#F7F8FA",
  white: "#FFFFFF",
  slate: "#526276",
  danger: "#D62828",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  md: 12,
  lg: 16,
  xl: 20,
} as const;
