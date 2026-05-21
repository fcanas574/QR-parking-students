import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@parking/shared";

export default function UnauthorizedScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        This account doesn't have access to the Guard app.
      </Text>
      <Pressable style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  title: { fontSize: 32, fontWeight: "700", color: colors.error, marginBottom: 8 },
  subtitle: {
    fontSize: 16,
    color: colors["on-surface-variant"],
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors["surface-container-high"],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: { fontSize: 14, fontWeight: "500", color: colors["on-background"] },
});
