import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";

type BookingDetail = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  totalHalalas: number;
  currency: string;
  tripTimeline?: { to: string; at: string; note?: string | null }[];
  route?: { code: string; nameEn: string };
};

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [location, setLocation] = useState<string>("No active location sample");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const b = await api<BookingDetail>(`/bookings/${id}`);
        setBooking(b);
        const loc = await api<{ sample: { latitude: number; longitude: number } | null }>(
          `/bookings/${id}/location`,
        );
        if (loc.sample) {
          setLocation(`${loc.sample.latitude.toFixed(4)}, ${loc.sample.longitude.toFixed(4)}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    })();
  }, [id]);

  if (!booking && !error) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color="#1B4F8A" />
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="customer-trip-detail">
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {booking ? (
        <>
          <Text style={styles.h1}>{booking.reference}</Text>
          <Text style={styles.meta}>{booking.status}</Text>
          <Text style={styles.meta}>{booking.route?.nameEn}</Text>
          <Text style={styles.meta}>
            {(booking.totalHalalas / 100).toFixed(2)} {booking.currency}
          </Text>
          <Text style={styles.section}>Driver location (consented)</Text>
          <Text style={styles.meta}>{location}</Text>
          <Text style={styles.section}>Timeline</Text>
          {(booking.tripTimeline ?? []).map((e, i) => (
            <Text key={i} style={styles.meta}>
              {e.to} · {new Date(e.at).toLocaleString()}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB", gap: 6 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A" },
  section: { marginTop: 14, fontWeight: "700", color: "#0B1F3A" },
  meta: { color: "#526276" },
  err: { color: "#B42318" },
});
