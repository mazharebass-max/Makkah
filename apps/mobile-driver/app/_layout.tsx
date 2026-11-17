import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#0B1F3A" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="index" options={{ title: "Driver" }} />
      <Stack.Screen name="trips" options={{ title: "Assigned trips" }} />
      <Stack.Screen name="trip/[id]" options={{ title: "Trip ops" }} />
    </Stack>
  );
}
