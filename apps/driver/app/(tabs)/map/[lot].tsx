import React from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";

export default function LotDetailScreen() {
  const { lot } = useLocalSearchParams<{ lot: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lot", lot],
    queryFn: async () => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*, lot_occupancy(current_count)")
        .eq("id", lot)
        .maybeSingle();
      return data as Record<string, unknown> | null;
    },
    enabled: !!lot,
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
        <Text style={styles.errorText}>Could not load lot details.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text style={styles.errorText}>Parking lot not found.</Text>
      </View>
    );
  }

  const occupancy = data.lot_occupancy as Record<string, unknown> | null;
  const totalSpaces = data.total_spaces as number;
  const currentCount = (occupancy?.current_count as number) ?? 0;
  const pct =
    totalSpaces > 0
      ? Math.round((currentCount / totalSpaces) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: (data.name as string) ?? "Lot" }} />
      <GlassPanel glow style={styles.card}>
        <Text style={styles.lotName}>{data.name as string}</Text>
        <Text style={styles.occupancy}>
          {currentCount} / {totalSpaces} occupied ({pct}%)
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%` as const },
            ]}
          />
        </View>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  card: {},
  lotName: {
    fontSize: 32,
    fontWeight: "600",
    color: colors["primary-fixed"],
  },
  occupancy: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface-variant"],
    marginTop: 8,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors["surface-variant"],
    borderRadius: 3,
    marginTop: spacing.sm,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 3,
    backgroundColor: colors["secondary-fixed"],
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
