import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { setToken } from "../../lib/api";

export default function AccountTab() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Account</Text>
      <Pressable
        style={styles.btn}
        onPress={() => {
          void setToken(null).then(() => router.replace("/"));
        }}
      >
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#F4F7FB", gap: 12 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0B1F3A" },
  btn: {
    backgroundColor: "#0B1F3A",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
