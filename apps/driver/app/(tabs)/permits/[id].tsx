import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GlassPanel,
  MaterialSymbol,
  colors,
  spacing,
} from "@parking/shared";
import { supabase } from "@parking/shared";

export default function PermitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: permit, isLoading, isError, refetch } = useQuery({
    queryKey: ["permit", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select(
          "*, parking_lots(name), vehicles(plate_number, make, model)",
        )
        .eq("id", id as string)
        .maybeSingle();
      return data as Record<string, unknown> | null;
    },
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("permits") as any)
        .update({ status: "expired" })
        .eq("id", id as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Could not cancel permit."),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors["secondary-fixed"]} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load permit details.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!permit) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text style={styles.errorText}>Permit not found.</Text>
      </View>
    );
  }

  const parkingLot =
    permit.parking_lots as Record<string, unknown> | null;
  const vehicle =
    permit.vehicles as Record<string, unknown> | null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: "Permit Details" }} />

      <GlassPanel glow style={styles.heroCard}>
        <MaterialSymbol
          name="payments"
          size={32}
          color={colors["secondary-fixed"]}
          filled
        />
        <Text style={styles.heroTitle}>
          {(parkingLot?.name as string) ?? "Unknown Lot"}
        </Text>
        <Text style={styles.heroStatus}>
          {(permit.status as string)?.toUpperCase()}
        </Text>
      </GlassPanel>

      <GlassPanel style={styles.infoCard}>
        <Text style={styles.sectionLabel}>Vehicle</Text>
        <Text style={styles.infoText}>
          {(vehicle?.plate_number as string) ?? "N/A"}
        </Text>
        <Text style={styles.infoSub}>
          {(vehicle?.make as string) ?? ""}{" "}
          {(vehicle?.model as string) ?? ""}
        </Text>
      </GlassPanel>

      <GlassPanel style={styles.infoCard}>
        <Text style={styles.sectionLabel}>Period</Text>
        <Text style={styles.infoText}>
          {new Date(
            permit.starts_at as string,
          ).toLocaleDateString()}{" "}
          —{" "}
          {new Date(
            permit.expires_at as string,
          ).toLocaleDateString()}
        </Text>
        <Text style={styles.infoSub}>
          Auto-renew:{" "}
          {(permit.auto_renew as boolean) ? "ON" : "OFF"}
        </Text>
      </GlassPanel>

      <GlassPanel style={styles.infoCard}>
        <Text style={styles.sectionLabel}>Payment</Text>
        <Text style={styles.infoText}>
          {(permit.payment_status as string)?.toUpperCase()}
        </Text>
      </GlassPanel>

      {(permit.status as string) === "active" && (
        <Pressable
          style={styles.cancelButton}
          onPress={() =>
            Alert.alert(
              "Cancel Permit",
              "Are you sure? This cannot be undone.",
              [
                { text: "No", style: "cancel" },
                {
                  text: "Yes, Cancel",
                  style: "destructive",
                  onPress: () => cancelMutation.mutate(),
                },
              ],
            )
          }
        >
          <MaterialSymbol
            name="cancel"
            size={20}
            color={colors.error}
          />
          <Text style={styles.cancelText}>Cancel Permit</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["margin-mobile"],
    paddingBottom: 100,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  heroCard: { alignItems: "center", gap: spacing.xs },
  heroTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors["on-background"],
  },
  heroStatus: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["secondary-fixed"],
    letterSpacing: 2,
  },
  infoCard: {},
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors["on-background"],
  },
  infoSub: {
    fontSize: 14,
    color: colors["on-surface-variant"],
    marginTop: 2,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,180,171,0.5)",
    marginTop: spacing.md,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.error,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors["on-surface-variant"],
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors["surface-variant"],
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors["on-surface"],
  },
});
