import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { login } from "../lib/api";

export default function CustomerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/(tabs)/trips");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap} testID="customer-login">
      <Text style={styles.brand}>Haramain Ride</Text>
      <Text style={styles.sub}>Customer app — authenticated bookings only</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void onLogin()}>
        <Text style={styles.btnText}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
      <Text style={styles.note}>Never invents live availability or gateway success</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: "#F4F7FB", gap: 12, justifyContent: "center" },
  brand: { fontSize: 28, fontWeight: "700", color: "#0B1F3A" },
  sub: { color: "#526276", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#1B4F8A",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  err: { color: "#B42318" },
  note: { color: "#8795A8", fontSize: 12, marginTop: 8 },
});
