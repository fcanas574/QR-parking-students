import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { MaterialSymbol, GlassPanel, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScanResult } from "@parking/shared";

export default function GuardScannerScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1250, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1250, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [scanning]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  // Helper to cast supabase insert payloads since Database types are stubs
  const _insert = (table: string, payload: Record<string, unknown>) =>
    supabase.from(table as any).insert(payload as any);

  const logScan = useMutation({
    mutationFn: async (result: ScanResult) => {
      const { error } = await _insert("access_logs", {
        vehicle_id: (result.vehicle as Record<string, unknown>)?.id,
        permit_id: (result.permit as Record<string, unknown>)?.id ?? null,
        lot_id: (result.permit as Record<string, unknown>)?.lot_id ?? "00000000-0000-0000-0000-000000000000",
        scanned_by: (profile as Record<string, unknown>)?.id,
        direction: result.direction,
        method: result.method,
        is_valid: result.isValid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessLogs"] });
      setScanResult(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to log scan.");
    },
  });

  const handleSimulatedScan = async (direction: "entry" | "exit") => {
    setScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));

      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("*, profiles(full_name)")
        .eq("plate_number", "XYZ-9876")
        .maybeSingle();

      const v = vehicle as Record<string, unknown> | null;

      if (!v) {
        setScanResult({
          vehicle: null,
          permit: null,
          isValid: false,
          reason: "Vehicle not found in system",
          direction,
          method: "qr",
        });
        return;
      }

      const { data: permitRow } = await supabase
        .from("permits")
        .select("*")
        .eq("vehicle_id", v.id as string)
        .eq("status", "active")
        .maybeSingle();

      const p = permitRow as Record<string, unknown> | null;

      const result: ScanResult = {
        vehicle: v as ScanResult["vehicle"],
        permit: p as ScanResult["permit"],
        isValid: !!p,
        reason: p ? undefined : "No active permit",
        direction,
        method: "qr",
      };

      setScanResult(result);

      if (result.isValid) {
        logScan.mutate(result);
      }
    } catch (err) {
      setScanResult({
        vehicle: null,
        permit: null,
        isValid: false,
        reason: "Scan failed. Try again.",
        direction,
        method: "qr",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Scanner core */}
      <View style={styles.scannerArea}>
        <View style={styles.ring} />
        <Animated.View style={[styles.scannerCore, scanning && { transform: [{ scale }] }]}>
          <MaterialSymbol
            name="qr_code_scanner"
            size={64}
            color={
              scanResult
                ? scanResult.isValid
                  ? colors["secondary-fixed"]
                  : colors.error
                : colors["secondary-fixed"]
            }
            filled
          />
          <Text style={styles.scanLabel}>
            {scanning ? "Reading..." : "Point at QR/NFC"}
          </Text>
        </Animated.View>
      </View>

      {/* Entry/Exit buttons */}
      <View style={styles.directionRow}>
        <Pressable
          style={[styles.dirButton, styles.entryButton]}
          onPress={() => handleSimulatedScan("entry")}
          disabled={scanning}
        >
          <Text style={styles.dirButtonText}>ENTRY</Text>
        </Pressable>
        <Pressable
          style={[styles.dirButton, styles.exitButton]}
          onPress={() => handleSimulatedScan("exit")}
          disabled={scanning}
        >
          <Text style={styles.dirButtonText}>EXIT</Text>
        </Pressable>
      </View>

      {/* Scan result */}
      {scanResult && (
        <GlassPanel
          glow={scanResult.isValid}
          style={[styles.resultCard, !scanResult.isValid && styles.resultInvalid]}
        >
          <Text
            style={[
              styles.resultTitle,
              !scanResult.isValid && { color: colors.error },
            ]}
          >
            {scanResult.isValid ? "VALID" : "DENIED"}
          </Text>
          {scanResult.vehicle && (
            <Text style={styles.resultPlate}>
              {String((scanResult.vehicle as Record<string, unknown>).plate_number ?? "")}
            </Text>
          )}
          <Text style={styles.resultReason}>
            {scanResult.isValid
              ? `${scanResult.direction.toUpperCase()} logged`
              : scanResult.reason}
          </Text>
        </GlassPanel>
      )}

      {/* Manual entry fallback */}
      <Pressable
        style={styles.manualButton}
        onPress={() => router.push("/(tabs)/scanner/manual")}
      >
        <MaterialSymbol name="campaign" size={20} color={colors["on-surface-variant"]} />
        <Text style={styles.manualText}>Manual Entry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    padding: spacing["margin-mobile"],
  },
  scannerArea: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  ring: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
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
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["secondary-fixed"],
    letterSpacing: 2,
    marginTop: 12,
    textTransform: "uppercase",
  },
  directionRow: { flexDirection: "row", gap: spacing.md, marginTop: 40 },
  dirButton: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 12 },
  entryButton: { backgroundColor: colors["secondary-fixed"] },
  exitButton: {
    backgroundColor: "rgba(54,255,196,0.3)",
    borderWidth: 1,
    borderColor: colors["secondary-fixed"],
  },
  dirButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors["on-secondary-fixed"],
    letterSpacing: 2,
  },
  resultCard: { marginTop: 32, alignItems: "center", width: "100%" },
  resultInvalid: { borderColor: "rgba(255,180,171,0.5)", borderWidth: 1 },
  resultTitle: { fontSize: 32, fontWeight: "700", color: colors["on-background"] },
  resultPlate: {
    fontSize: 18,
    fontWeight: "700",
    color: colors["on-surface-variant"],
    letterSpacing: 3,
    marginTop: 4,
  },
  resultReason: { fontSize: 14, color: colors["on-surface-variant"], marginTop: 8 },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
    marginBottom: 20,
    padding: 16,
  },
  manualText: { fontSize: 14, color: colors["on-surface-variant"] },
});
