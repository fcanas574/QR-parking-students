import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../design/tokens";

export function ConnectivityBanner({
  isConnected,
  queueCount,
}: {
  isConnected: boolean;
  queueCount: number;
}) {
  if (isConnected && queueCount === 0) return null;

  return (
    <View style={[styles.banner, !isConnected && styles.offline]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: isConnected ? "#FFB74D" : colors.error },
        ]}
      />
      <Text style={styles.text}>
        {isConnected
          ? `Offline · ${queueCount} queued`
          : "No connection · scans saved locally"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255,183,77,0.15)",
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  offline: { backgroundColor: "rgba(255,180,171,0.15)" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
  },
});
