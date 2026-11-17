import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { api, type TripRow } from "../../lib/api";

export default function TripsTab() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ data: TripRow[] }>("/bookings");
        setTrips(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load trips");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color="#1B4F8A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} testID="customer-trips">
      <Text style={styles.h1}>My trips</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {trips.length === 0 ? <Text style={styles.muted}>No bookings yet</Text> : null}
      {trips.map((t) => (
        <Pressable
          key={t.id}
          style={styles.card}
          onPress={() => router.push(`/trip/${t.id}`)}
        >
          <Text style={styles.ref}>{t.reference}</Text>
          <Text style={styles.meta}>
            {t.status} · {t.route?.code ?? "—"} · {(t.totalHalalas / 100).toFixed(2)} {t.currency}
          </Text>
          <Text style={styles.meta}>{new Date(t.scheduledAt).toLocaleString()}</Text>
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
  meta: { color: "#526276", marginTop: 4, fontSize: 13 },
  muted: { color: "#8795A8" },
  err: { color: "#B42318", marginBottom: 8 },
});
