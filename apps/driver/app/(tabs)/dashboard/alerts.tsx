import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { useQuery } from "@tanstack/react-query";

export default function AlertsScreen() {
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      return [
        {
          id: "1",
          title: "Lot C Closure Tomorrow",
          body: "Lot C will be closed for repaving starting 06:00 AM. Please use Lot D.",
          time: "2 hours ago",
          type: "warning",
        },
      ];
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>System Alerts</Text>
      {alerts?.map((alert) => (
        <GlassPanel key={alert.id} style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <MaterialSymbol name="campaign" size={16} color={colors.error} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertBody}>{alert.body}</Text>
              <Text style={styles.alertTime}>{alert.time.toUpperCase()}</Text>
            </View>
          </View>
        </GlassPanel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], gap: spacing.sm },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.outline,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  alertCard: { padding: spacing.sm },
  alertRow: { flexDirection: "row", gap: spacing.sm },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(147,0,10,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertContent: { flex: 1 },
  alertTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-background"],
  },
  alertBody: {
    fontSize: 14,
    color: colors["on-surface-variant"],
    marginTop: 4,
  },
  alertTime: { fontSize: 12, color: colors.outline, marginTop: 8 },
});
