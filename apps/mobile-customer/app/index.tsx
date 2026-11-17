/**
 * Customer mobile shell (Expo Router target for M6).
 * M1 keeps a typed placeholder so the monorepo layout matches the PRD without requiring a native toolchain in CI.
 */
export const customerAppMeta = {
  name: "Haramain Ride Customer",
  tabs: ["Home", "Trips", "Help", "Account"] as const,
  apiBaseEnv: "EXPO_PUBLIC_API_URL",
};

export default function CustomerHomePlaceholder() {
  return null;
}
