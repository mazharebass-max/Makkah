import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";

type Trip = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  route: { code: string } | null;
};

export default function DriverTrips() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ data: Trip[] }>("/driver/trips")
      .then((r) => setTrips(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <ScrollView style={styles.wrap} testID="driver-trips">
      <Text style={styles.h1}>Assigned trips</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {trips.length === 0 ? <Text style={styles.muted}>No assignments yet</Text> : null}
      {trips.map((t) => (
        <Pressable key={t.id} style={styles.card} onPress={() => router.push(`/trip/${t.id}`)}>
          <Text style={styles.ref}>{t.reference}</Text>
          <Text style={styles.meta}>
            {t.status} · {t.route?.code ?? "—"}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB" },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6EDF5",
  },
  ref: { fontWeight: "700", color: "#0B1F3A" },
  meta: { color: "#526276", marginTop: 4 },
  muted: { color: "#8795A8" },
  err: { color: "#B42318" },
});
