import { View, Text, StyleSheet } from "react-native";

export default function HelpTab() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Help</Text>
      <Text style={styles.p}>Support tickets land in a later milestone. For now contact ops via web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB", gap: 8 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A" },
  p: { color: "#526276" },
});
