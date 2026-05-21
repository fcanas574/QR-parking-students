import React from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { supabase, colors, spacing } from "@parking/shared";
import { router } from "expo-router";
import type { ParkingLot, LotOccupancy } from "@parking/shared";

export default function MapScreen() {
  const { data: lots, isLoading, isError, refetch } = useQuery({
    queryKey: ["lotsWithOccupancy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*, lot_occupancy(current_count)")
        .eq("is_active", true);
      return data as (ParkingLot & {
        lot_occupancy: { current_count: number } | null;
      })[] | null;
    },
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
        <Text style={styles.errorText}>Could not load parking lots.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const getMarkerColor = (current: number, total: number) => {
    const pct = current / total;
    if (pct > 0.9) return colors.error;
    if (pct > 0.7) return "#FFB74D"; // amber
    return colors["secondary-fixed"];
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 40.7128,
          longitude: -74.006,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {lots?.map((lot) => {
          const lat = lot.latitude as number | null;
          const lng = lot.longitude as number | null;
          if (!lat || !lng) return null;
          const current =
            lot.lot_occupancy?.current_count ?? 0;
          const total = lot.total_spaces as number;
          return (
            <Marker
              key={lot.id as string}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={getMarkerColor(current, total)}
              onCalloutPress={() =>
                router.push(`/(tabs)/map/${lot.id}`)
              }
            >
              <Callout>
                <Text style={styles.calloutTitle}>
                  {lot.name as string}
                </Text>
                <Text style={styles.calloutSub}>
                  {current}/{total} spots
                </Text>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  calloutTitle: { fontWeight: "600", fontSize: 14, color: "#000" },
  calloutSub: { fontSize: 12, color: "#666" },
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
