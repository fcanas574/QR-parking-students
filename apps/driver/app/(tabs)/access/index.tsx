import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function AccessScreen() {
  const { profile } = useAuth();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const scanLineLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const {
    data: activePermit,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["activePermit", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select("*, parking_lots(name), vehicles(plate_number)")
        .eq("profile_id", profile?.id as string)
        .eq("status", "active")
        .maybeSingle();
      return data as Record<string, unknown> | null;
    },
    enabled: !!profile?.id,
  });

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    pulseLoopRef.current = pulse;

    const scanLine = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    scanLine.start();
    scanLineLoopRef.current = scanLine;

    return () => {
      pulseLoopRef.current?.stop();
      scanLineLoopRef.current?.stop();
    };
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.95, 1, 0.95],
  });

  const parkingLot =
    activePermit?.parking_lots as Record<string, unknown> | null;
  const vehicle =
    activePermit?.vehicles as Record<string, unknown> | null;
  const lotName = (parkingLot?.name as string) ?? "No active permit";
  const plateNumber = (vehicle?.plate_number as string) ?? "N/A";

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      {/* Authorized Vehicle Card */}
      <View style={styles.authCard}>
        {isLoading ? (
          <ActivityIndicator color={colors["secondary-fixed"]} />
        ) : isError ? (
          <Text style={styles.errorText}>
            Could not load permit.
          </Text>
        ) : !activePermit ? (
          <Text style={styles.errorText}>
            No active permit. Purchase one in the Permits tab.
          </Text>
        ) : (
          <>
            <View style={styles.authRow}>
              <View>
                <Text style={styles.destLabel}>Destination</Text>
                <Text style={styles.destText}>{lotName}</Text>
              </View>
              <View style={styles.carIcon}>
                <MaterialSymbol
                  name="directions_car"
                  size={20}
                  color={colors["on-surface-variant"]}
                />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.authRow}>
              <Text style={styles.destLabel}>Authorized Vehicle</Text>
              <View style={styles.plateBox}>
                <Text style={styles.plateText}>{plateNumber}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Scanner HUD */}
      <Pressable style={styles.scannerArea}>
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringMid]} />
        <Animated.View
          style={[
            styles.scannerCore,
            { transform: [{ scale }] },
          ]}
        >
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-96, 96],
                    }),
                  },
                ],
              },
            ]}
          />
          <MaterialSymbol
            name="nfc"
            size={64}
            color={colors["secondary-fixed"]}
          />
          <Text style={styles.tapText}>Tap to Enter</Text>
        </Animated.View>
      </Pressable>

      {/* Status indicator */}
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>System Ready</Text>
      </View>

      {/* Emergency button */}
      <Pressable style={styles.emergencyButton}>
        <MaterialSymbol
          name="emergency"
          size={20}
          color={colors.error}
        />
        <Text style={styles.emergencyText}>Need Assistance?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["margin-mobile"],
  },
  ambientGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(54,255,196,0.05)",
    top: "30%",
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(30,32,36,0.4)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    borderLeftColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  authRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  destText: {
    fontSize: 24,
    fontWeight: "600",
    color: colors["primary-fixed"],
  },
  carIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors["surface-container-highest"],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(132,148,149,0.5)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: spacing.sm,
  },
  plateBox: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors["outline-variant"],
  },
  plateText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-surface"],
    letterSpacing: 3,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    textAlign: "center",
    paddingVertical: 16,
  },
  scannerArea: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
    position: "relative",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(54,255,196,0.2)",
  },
  ringOuter: { width: 300, height: 300 },
  ringMid: {
    width: 240,
    height: 240,
    borderColor: "rgba(54,255,196,0.3)",
  },
  scannerCore: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "rgba(40,42,46,0.8)",
    borderWidth: 2,
    borderColor: colors["secondary-fixed"],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    width: "100%" as const,
    height: 2,
    backgroundColor: colors["secondary-fixed"],
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  tapText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["secondary-fixed"],
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors["secondary-fixed"],
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(30,32,36,0.5)",
    marginTop: "auto",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,180,171,0.3)",
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.error,
  },
});
