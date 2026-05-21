import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function ManualEntryScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState("");
  const [direction, setDirection] = useState<"entry" | "exit">("entry");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: vehicleRow } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate_number", plate.toUpperCase())
        .single();

      const vehicle = vehicleRow as Record<string, unknown> | null;
      if (!vehicle) throw new Error("Vehicle not found");

      const { data: permitRow } = await supabase
        .from("permits")
        .select("id, lot_id")
        .eq("vehicle_id", vehicle.id as string)
        .eq("status", "active")
        .single();

      const permit = permitRow as Record<string, unknown> | null;

      const { error } = await (supabase.from("access_logs") as any).insert({
        vehicle_id: vehicle.id,
        permit_id: permit?.id ?? null,
        lot_id: permit?.lot_id ?? "00000000-0000-0000-0000-000000000000",
        scanned_by: (profile as Record<string, unknown>)?.id,
        direction,
        method: "manual",
        is_valid: !!permit,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessLogs"] });
      router.back();
    },
  });

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.form}>
        <Text style={styles.label}>Plate Number</Text>
        <TextInput
          style={styles.input}
          value={plate}
          onChangeText={setPlate}
          placeholder="XYZ-1234"
          placeholderTextColor={colors.outline}
          autoCapitalize="characters"
        />
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, direction === "entry" && styles.toggleActive]}
            onPress={() => setDirection("entry")}
          >
            <Text
              style={[
                styles.toggleText,
                direction === "entry" && styles.toggleActiveText,
              ]}
            >
              ENTRY
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, direction === "exit" && styles.toggleActive]}
            onPress={() => setDirection("exit")}
          >
            <Text
              style={[
                styles.toggleText,
                direction === "exit" && styles.toggleActiveText,
              ]}
            >
              EXIT
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={[
            styles.submitButton,
            (!plate || submitMutation.isPending) && { opacity: 0.5 },
          ]}
          onPress={() => submitMutation.mutate()}
          disabled={!plate || submitMutation.isPending}
        >
          <Text style={styles.submitText}>Log {direction.toUpperCase()}</Text>
        </Pressable>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing["margin-mobile"],
  },
  form: { gap: spacing.sm },
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
    fontSize: 24,
    fontWeight: "700",
    color: colors["on-background"],
    letterSpacing: 3,
    textAlign: "center",
    fontFamily: "Sora",
  },
  toggleRow: { flexDirection: "row", gap: spacing.sm },
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors["surface-variant"],
  },
  toggleActive: { backgroundColor: colors["secondary-fixed"] },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface-variant"],
  },
  toggleActiveText: { color: colors["on-secondary-fixed"] },
  submitButton: {
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
});
