export async function requestForegroundPermissionsAsync() {
  return { status: "granted" as const };
}

export async function getCurrentPositionAsync(_opts?: { accuracy?: number }) {
  return {
    coords: {
      latitude: 21.4225,
      longitude: 39.8262,
      accuracy: 12,
    },
  };
}

export const Accuracy = { Balanced: 3 };
