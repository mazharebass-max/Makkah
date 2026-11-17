import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { api } from "../../lib/api";

export default function DriverTripOps() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<string>("—");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<{ status: string }>(`/bookings/${id}`).then((b) => setStatus(b.status));
  }, [id]);

  async function transition(toStatus: string) {
    if (!id) return;
    const res = await api<{ status: string }>(`/bookings/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ toStatus, note: `Driver app → ${toStatus}` }),
    });
    setStatus(res.status);
    setMessage(`Status → ${res.status}`);
  }

  async function shareLocation() {
    if (!id) return;
    await api(`/bookings/${id}/location/consent`, { method: "POST", body: "{}" });
    await Location.requestForegroundPermissionsAsync();
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const sample = await api<{ retentionNote: string }>(`/bookings/${id}/location`, {
      method: "POST",
      body: JSON.stringify({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
      }),
    });
    setMessage(sample.retentionNote);
  }

  return (
    <View style={styles.wrap} testID="driver-trip-ops">
      <Text style={styles.h1}>Trip ops</Text>
      <Text style={styles.meta}>Current status: {status}</Text>
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void transition("DRIVER_EN_ROUTE")}>
        <Text style={styles.btnText}>En route</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => void transition("ARRIVED")}>
        <Text style={styles.btnText}>Arrived</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => void transition("IN_PROGRESS")}>
        <Text style={styles.btnText}>Start trip</Text>
      </Pressable>
      <Pressable style={styles.btnSecondary} onPress={() => void shareLocation()}>
        <Text style={styles.btnText}>Share location (consent)</Text>
      </Pressable>
      <Text style={styles.note}>Location only after explicit consent; samples expire in 24h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB", gap: 10 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A" },
  meta: { color: "#526276" },
  ok: { color: "#087F6D" },
  btn: { backgroundColor: "#087F6D", padding: 14, borderRadius: 12, alignItems: "center" },
  btnSecondary: {
    backgroundColor: "#1B4F8A",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  note: { color: "#8795A8", fontSize: 12 },
});
