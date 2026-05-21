import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";
import type { Permit, LotOccupancy } from "@parking/shared";

export default function DashboardScreen() {
  const { profile } = useAuth();

  const { data: permit } = useQuery({
    queryKey: ["activePermit", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select("*, parking_lots(name), vehicles(plate_number)")
        .eq("profile_id", profile?.id as string)
        .eq("status", "active")
        .single();
      return data as
        | (Permit & {
            parking_lots: { name: string } | null;
            vehicles: { plate_number: string } | null;
          })
        | null;
    },
    enabled: !!profile?.id,
  });

  const { data: occupancies } = useQuery({
    queryKey: ["lotOccupancy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lot_occupancy")
        .select("*, parking_lots(name, total_spaces)");
      return data as (LotOccupancy & {
        parking_lots: { name: string; total_spaces: number } | null;
      })[];
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Permit Hero */}
      <GlassPanel glow style={styles.heroPanel}>
        <View style={styles.heroRow}>
          <View>
            <View style={styles.verifiedRow}>
              <MaterialSymbol
                name="verified"
                size={16}
                color={colors["secondary-fixed"]}
                filled
              />
              <Text style={styles.sectionLabel}>Active Permit</Text>
            </View>
            <Text style={styles.permitName}>
              {permit?.parking_lots
                ? permit.parking_lots.name
                : "No active permit"}
            </Text>
            {permit?.vehicles && (
              <Text style={styles.plateText}>
                EXP: {new Date(permit.expires_at as string).toLocaleDateString()} •
                AUTO-RENEW {(permit.auto_renew as boolean) ? "ON" : "OFF"}
              </Text>
            )}
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Valid</Text>
          </View>
        </View>
      </GlassPanel>

      {/* Current Parked Location */}
      <GlassPanel style={styles.locationPanel}>
        <View style={styles.heroRow}>
          <View>
            <View style={styles.verifiedRow}>
              <MaterialSymbol
                name="location_on"
                size={16}
                color={colors["primary-fixed-dim"]}
              />
              <Text style={styles.sectionLabel}>Current Vehicle</Text>
            </View>
            <Text style={styles.locationText}>Lot B</Text>
            <Text style={styles.spotText}>Spot 42 • Level 2</Text>
          </View>
        </View>
        <Pressable style={styles.findCarButton}>
          <MaterialSymbol
            name="directions_car"
            size={20}
            color={colors["on-primary-fixed"]}
          />
          <Text style={styles.findCarText}>Find My Car</Text>
        </Pressable>
      </GlassPanel>

      {/* Campus Trends */}
      <GlassPanel style={styles.statsPanel}>
        <View style={styles.statsHeader}>
          <MaterialSymbol
            name="bar_chart"
            size={20}
            color={colors["on-surface-variant"]}
          />
          <Text style={styles.sectionLabel}>Campus Trends</Text>
        </View>
        {occupancies?.map((occ) => {
          const pct = occ.parking_lots?.total_spaces
            ? Math.round(
                ((occ.current_count as number) / occ.parking_lots.total_spaces) * 100
              )
            : 0;
          const barColor = pct > 90 ? colors.error : colors["secondary-fixed"];
          return (
            <View key={occ.lot_id as string} style={styles.statBar}>
              <View style={styles.statLabelRow}>
                <Text style={styles.statLabel}>
                  {occ.parking_lots?.name ?? "Unknown"}
                </Text>
                <Text style={[styles.statPct, { color: barColor }]}>
                  {pct}% Full
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct}%` as any,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </GlassPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["margin-mobile"],
    paddingBottom: 100,
    gap: spacing.md,
  },
  heroPanel: { overflow: "hidden" },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  permitName: {
    fontSize: 48,
    fontWeight: "700",
    color: colors["on-background"],
    marginTop: 4,
  },
  plateText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface-variant"],
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(54,255,196,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(54,255,196,0.3)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors["secondary-fixed"],
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["secondary-fixed"],
  },
  locationPanel: {},
  locationText: {
    fontSize: 32,
    fontWeight: "600",
    color: colors["on-background"],
  },
  spotText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface-variant"],
  },
  findCarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  findCarText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-primary-fixed"],
  },
  statsPanel: {},
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBar: { marginBottom: spacing.sm },
  statLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-background"],
  },
  statPct: { fontSize: 12, fontWeight: "600" },
  progressTrack: {
    height: 6,
    backgroundColor: colors["surface-variant"],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
});
