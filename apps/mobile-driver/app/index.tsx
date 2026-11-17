import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { login } from "../lib/api";

export default function DriverLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("driver@haramain.local");
  const [password, setPassword] = useState("DriverDev!23456");
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={styles.wrap} testID="driver-login">
      <Text style={styles.brand}>Haramain Driver</Text>
      <Text style={styles.sub}>Assignments, status updates, consented location only</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable
        style={styles.btn}
        onPress={() => {
          void login(email, password)
            .then(() => router.replace("/trips"))
            .catch((e) => setError(e instanceof Error ? e.message : "Login failed"));
        }}
      >
        <Text style={styles.btnText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: "#F4F7FB", gap: 12, justifyContent: "center" },
  brand: { fontSize: 28, fontWeight: "700", color: "#0B1F3A" },
  sub: { color: "#526276" },
  input: {
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  btn: { backgroundColor: "#087F6D", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  err: { color: "#B42318" },
});
