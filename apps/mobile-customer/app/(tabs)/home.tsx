import { View, Text, StyleSheet } from "react-native";

export default function HomeTab() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Book a Haramain transfer</Text>
      <Text style={styles.p}>
        Use search on the web checkout or continue from Trips for history. Inventory comes from the
        API only — no fabricated availability.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB", gap: 8 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A" },
  p: { color: "#526276", lineHeight: 22 },
});
