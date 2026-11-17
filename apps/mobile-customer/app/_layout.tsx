import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#0B1F3A" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="index" options={{ title: "Haramain Ride" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ title: "Trip" }} />
    </Stack>
  );
}
