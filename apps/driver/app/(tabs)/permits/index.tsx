import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  GlassPanel,
  MaterialSymbol,
  colors,
  spacing,
} from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function PermitsScreen() {
  const { profile } = useAuth();

  const { data: permits, isLoading, isError, refetch } = useQuery({
    queryKey: ["permits", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select("*, parking_lots(name), vehicles(plate_number)")
        .eq("profile_id", profile?.id as string)
        .order("created_at", { ascending: false });
      return data as Record<string, unknown>[] | null;
    },
    enabled: !!profile?.id,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        style={styles.buyButton}
        onPress={() => router.push("/(tabs)/permits/buy")}
      >
        <MaterialSymbol
          name="payments"
          size={20}
          color={colors["on-primary-fixed"]}
        />
        <Text style={styles.buyText}>Buy New Permit</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator color={colors["secondary-fixed"]} />
        </View>
      ) : isError ? (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>Could not load permits.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : !permits || permits.length === 0 ? (
        <GlassPanel style={styles.emptyCard}>
          <MaterialSymbol
            name="receipt"
            size={32}
            color={colors["on-surface-variant"]}
          />
          <Text style={styles.emptyTitle}>No Permits Yet</Text>
          <Text style={styles.emptySub}>
            Tap the button above to purchase your first parking permit.
          </Text>
        </GlassPanel>
      ) : (
        permits.map((permit) => {
          const parkingLot =
            permit.parking_lots as Record<string, unknown> | null;
          const vehicle =
            permit.vehicles as Record<string, unknown> | null;
          return (
            <Pressable
              key={permit.id as string}
              onPress={() =>
                router.push(`/(tabs)/permits/${permit.id}`)
              }
            >
              <GlassPanel style={styles.permitCard}>
                <View style={styles.permitRow}>
                  <View>
                    <Text style={styles.permitLot}>
                      {(parkingLot?.name as string) ?? "Unknown"}
                    </Text>
                    <Text style={styles.permitPlate}>
                      {(vehicle?.plate_number as string) ?? "No vehicle"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      (permit.status as string) === "active" &&
                        styles.activeBadge,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {permit.status as string}
                    </Text>
                  </View>
                </View>
                <Text style={styles.permitDates}>
                  {new Date(
                    permit.starts_at as string,
                  ).toLocaleDateString()}{" "}
                  —{" "}
                  {new Date(
                    permit.expires_at as string,
                  ).toLocaleDateString()}
                </Text>
              </GlassPanel>
            </Pressable>
          );
        })
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
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "rgba(125,244,255,0.4)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  buyText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-primary-fixed"],
  },
  statusContainer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  permitCard: {},
  permitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  permitLot: {
    fontSize: 18,
    fontWeight: "600",
    color: colors["on-background"],
  },
  permitPlate: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface-variant"],
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors["surface-variant"],
  },
  activeBadge: {
    backgroundColor: "rgba(54,255,196,0.2)",
    borderWidth: 1,
    borderColor: "rgba(54,255,196,0.3)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
  },
  permitDates: {
    fontSize: 12,
    color: colors.outline,
    marginTop: 8,
    letterSpacing: 0.5,
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
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors["on-surface-variant"],
  },
  emptySub: {
    fontSize: 14,
    color: colors.outline,
    textAlign: "center",
  },
});
