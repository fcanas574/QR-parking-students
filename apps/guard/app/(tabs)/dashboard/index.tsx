import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function GuardDashboardScreen() {
  const { profile } = useAuth();

  const { data: todayStats } = useQuery({
    queryKey: ["todayScans", profile?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("access_logs")
        .select("*", { count: "exact", head: true })
        .eq("scanned_by", (profile as Record<string, unknown>)?.id as string)
        .gte("scanned_at", today);

      const { data: occupancy } = await supabase
        .from("lot_occupancy")
        .select("*, parking_lots(name, total_spaces)");

      return {
        count: count ?? 0,
        occupancy: (occupancy as Record<string, unknown>[]) ?? [],
      };
    },
    enabled: !!profile?.id,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPanel glow style={styles.heroCard}>
        <Text style={styles.heroNumber}>{todayStats?.count ?? 0}</Text>
        <Text style={styles.heroLabel}>Scans Today</Text>
      </GlassPanel>

      <Text style={styles.sectionTitle}>Lot Occupancy</Text>
      {todayStats?.occupancy?.map((occ: Record<string, unknown>) => {
        const lot = occ.parking_lots as Record<string, unknown> | undefined;
        const currentCount = (occ.current_count as number) ?? 0;
        const totalSpaces = (lot?.total_spaces as number) ?? 0;
        const pct = totalSpaces > 0 ? Math.round((currentCount / totalSpaces) * 100) : 0;

        return (
          <GlassPanel key={occ.lot_id as string} style={styles.occCard}>
            <View style={styles.occRow}>
              <Text style={styles.occName}>
                {(lot?.name as string) ?? "Unknown"}
              </Text>
              <Text style={styles.occCount}>
                {currentCount} / {totalSpaces || "?"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pct}%` as unknown as number,
                    backgroundColor:
                      pct > 90 ? colors.error : colors["secondary-fixed"],
                  },
                ]}
              />
            </View>
          </GlassPanel>
        );
      })}
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
  heroCard: { alignItems: "center" },
  heroNumber: { fontSize: 64, fontWeight: "700", color: colors["secondary-fixed"] },
  heroLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.outline,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  occCard: {},
  occRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  occName: { fontSize: 16, color: colors["on-background"] },
  occCount: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"] },
  progressTrack: {
    height: 6,
    backgroundColor: colors["surface-variant"],
    borderRadius: 3,
  },
  progressFill: { height: "100%" as unknown as number, borderRadius: 3 },
});
