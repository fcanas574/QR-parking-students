import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { GlassPanel, colors, spacing } from "@parking/shared";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded || !identifier || !password) return;
    setPending(true);
    setError("");
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Sign in failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.form}>
        <Text style={styles.heading}>UniPark Guard</Text>
        <Text style={styles.subtitle}>Security personnel sign in</Text>

        <Text style={styles.label}>Email or Phone</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@example.com"
          placeholderTextColor={colors.outline}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.outline}
          secureTextEntry
          textContentType="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, (!identifier || !password || pending) && { opacity: 0.5 }]}
          onPress={handleSignIn}
          disabled={!identifier || !password || pending}
        >
          {pending ? (
            <ActivityIndicator color={colors["on-primary-fixed"]} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing["margin-mobile"],
  },
  form: { gap: spacing.sm },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors["primary-fixed"],
    fontFamily: "Sora",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors["on-surface-variant"],
    textAlign: "center",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors["outline-variant"],
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors["on-background"],
    fontFamily: "Sora",
  },
  error: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-primary-fixed"],
  },
});
