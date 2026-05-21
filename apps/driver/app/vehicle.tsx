import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GlassPanel,
  MaterialSymbol,
  colors,
  spacing,
} from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function AddVehicleScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await (
        supabase.from("vehicles") as any
      )
        .insert({
          profile_id: profile.id,
          plate_number: plate.toUpperCase(),
          make,
          model,
          color,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVehicles"] });
      router.back();
    },
    onError: (err: any) => {
      const isDuplicate =
        (err as { code?: string }).code === "23505";
      Alert.alert(
        "Error",
        isDuplicate
          ? "This plate is already registered."
          : "Could not register vehicle.",
      );
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
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
        <Text style={styles.label}>Make</Text>
        <TextInput
          style={styles.input}
          value={make}
          onChangeText={setMake}
          placeholder="Toyota"
          placeholderTextColor={colors.outline}
        />
        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="Camry"
          placeholderTextColor={colors.outline}
        />
        <Text style={styles.label}>Color</Text>
        <TextInput
          style={styles.input}
          value={color}
          onChangeText={setColor}
          placeholder="Silver"
          placeholderTextColor={colors.outline}
        />

        <Pressable
          style={[
            styles.submitButton,
            !plate && { opacity: 0.5 },
          ]}
          onPress={() => addMutation.mutate()}
          disabled={!plate || addMutation.isPending}
        >
          <MaterialSymbol
            name="directions_car"
            size={20}
            color={colors["on-primary-fixed"]}
          />
          <Text style={styles.submitText}>
            {addMutation.isPending
              ? "Registering..."
              : "Register Vehicle"}
          </Text>
        </Pressable>
      </GlassPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"] },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors["on-background"],
    fontFamily: "Sora",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-primary-fixed"],
  },
});
