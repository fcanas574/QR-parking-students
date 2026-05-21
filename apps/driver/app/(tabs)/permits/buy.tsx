import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GlassPanel,
  MaterialSymbol,
  colors,
  spacing,
} from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

type Step = "lot" | "vehicle" | "confirm";

const STEPS: Step[] = ["lot", "vehicle", "confirm"];

export default function BuyPermitScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("lot");

  const {
    data: lots,
    isLoading: lotsLoading,
    isError: lotsError,
    refetch: refetchLots,
  } = useQuery({
    queryKey: ["activeLots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*")
        .eq("is_active", true);
      return data as Record<string, unknown>[] | null;
    },
  });

  const {
    data: vehicles,
    isLoading: vehiclesLoading,
    isError: vehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["myVehicles", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("profile_id", profile?.id as string);
      return data as Record<string, unknown>[] | null;
    },
    enabled: !!profile?.id,
  });

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await (
        supabase.from("permits") as any
      )
        .insert({
          profile_id: profile.id,
          vehicle_id: selectedVehicle!,
          lot_id: selectedLot!,
          status: "active",
          expires_at: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          payment_status: "paid",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      router.back();
    },
    onError: () => {
      Alert.alert("Error", "Could not create permit. Try again.");
    },
  });

  const goToStep = (targetStep: Step) => {
    const currentIndex = STEPS.indexOf(step);
    const targetIndex = STEPS.indexOf(targetStep);
    if (targetIndex < currentIndex) {
      setStep(targetStep);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
      if (step === "vehicle") setSelectedVehicle(null);
      if (step === "confirm") setSelectedLot(null);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={goBack}>
        <MaterialSymbol
          name="arrow_back"
          size={20}
          color={colors["on-surface-variant"]}
        />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {/* Step indicator */}
      <View style={styles.steps}>
        {STEPS.map((s) => (
          <Pressable
            key={s}
            onPress={() => goToStep(s)}
            style={[styles.stepDot, step === s && styles.stepActive]}
          />
        ))}
      </View>

      {step === "lot" && (
        <>
          {lotsLoading ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={colors["secondary-fixed"]} />
            </View>
          ) : lotsError ? (
            <View style={styles.statusContainer}>
              <Text style={styles.errorText}>Could not load lots.</Text>
              <Pressable onPress={() => refetchLots()} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : !lots || lots.length === 0 ? (
            <GlassPanel style={styles.emptyCard}>
              <MaterialSymbol
                name="location_off"
                size={32}
                color={colors["on-surface-variant"]}
              />
              <Text style={styles.emptyTitle}>No Active Lots</Text>
              <Text style={styles.emptySub}>
                No parking lots are currently available. Please check back later.
              </Text>
            </GlassPanel>
          ) : (
            lots.map((lot) => (
              <Pressable
                key={lot.id as string}
                onPress={() => {
                  setSelectedLot(lot.id as string);
                  setStep("vehicle");
                }}
              >
                <GlassPanel
                  style={[
                    styles.option,
                    selectedLot === (lot.id as string) &&
                      styles.optionSelected,
                  ]}
                >
                  <Text style={styles.optionTitle}>
                    {lot.name as string}
                  </Text>
                  <Text style={styles.optionSub}>
                    {lot.total_spaces as number} total spaces
                  </Text>
                </GlassPanel>
              </Pressable>
            ))
          )}
        </>
      )}

      {step === "vehicle" && (
        <>
          {vehiclesLoading ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={colors["secondary-fixed"]} />
            </View>
          ) : vehiclesError ? (
            <View style={styles.statusContainer}>
              <Text style={styles.errorText}>Could not load vehicles.</Text>
              <Pressable onPress={() => refetchVehicles()} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : !vehicles || vehicles.length === 0 ? (
            <GlassPanel style={styles.emptyCard}>
              <MaterialSymbol
                name="directions_car"
                size={32}
                color={colors["on-surface-variant"]}
              />
              <Text style={styles.emptyTitle}>No Vehicles</Text>
              <Text style={styles.emptySub}>
                Add a vehicle first before purchasing a permit.
              </Text>
              <Pressable
                style={styles.addVehicleButton}
                onPress={() => router.push("/vehicle")}
              >
                <Text style={styles.addVehicleText}>Add Vehicle</Text>
              </Pressable>
            </GlassPanel>
          ) : (
            vehicles.map((v) => (
              <Pressable
                key={v.id as string}
                onPress={() => {
                  setSelectedVehicle(v.id as string);
                  setStep("confirm");
                }}
              >
                <GlassPanel
                  style={[
                    styles.option,
                    selectedVehicle === (v.id as string) &&
                      styles.optionSelected,
                  ]}
                >
                  <Text style={styles.optionTitle}>
                    {v.plate_number as string}
                  </Text>
                  <Text style={styles.optionSub}>
                    {v.make as string} {v.model as string} {"•"}{" "}
                    {v.color as string}
                  </Text>
                </GlassPanel>
              </Pressable>
            ))
          )}
        </>
      )}

      {step === "confirm" && (
        <GlassPanel glow style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Confirm Purchase</Text>
          <Text style={styles.confirmText}>
            Lot:{" "}
            {lots?.find((l) => l.id === selectedLot)?.name as string}
          </Text>
          <Text style={styles.confirmText}>
            Vehicle:{" "}
            {
              vehicles?.find((v) => v.id === selectedVehicle)
                ?.plate_number as string
            }
          </Text>
          <Text style={styles.confirmText}>Duration: 90 days</Text>
          <Text style={styles.confirmPrice}>
            Amount: $0.00 (stubbed)
          </Text>
          <Pressable
            style={[
              styles.confirmButton,
              buyMutation.isPending && { opacity: 0.5 },
            ]}
            onPress={() => buyMutation.mutate()}
            disabled={buyMutation.isPending}
          >
            <MaterialSymbol
              name="payments"
              size={20}
              color={colors["on-primary-fixed"]}
            />
            <Text style={styles.confirmButtonText}>
              {buyMutation.isPending
                ? "Processing..."
                : "Confirm & Pay"}
            </Text>
          </Pressable>
        </GlassPanel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["margin-mobile"],
    gap: spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors["surface-variant"],
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors["on-surface-variant"],
  },
  steps: {
    flexDirection: "row",
    gap: spacing.base,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors["surface-variant"],
  },
  stepActive: {
    backgroundColor: colors["secondary-fixed"],
  },
  statusContainer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  option: {},
  optionSelected: {
    borderColor: colors["secondary-fixed"],
    borderWidth: 2,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors["on-background"],
  },
  optionSub: {
    fontSize: 14,
    color: colors["on-surface-variant"],
    marginTop: 4,
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
  addVehicleButton: {
    marginTop: spacing.sm,
    backgroundColor: colors["primary-fixed"],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addVehicleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors["on-primary-fixed"],
  },
  confirmCard: { alignItems: "center" },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors["on-background"],
  },
  confirmText: {
    fontSize: 14,
    color: colors["on-surface-variant"],
    marginTop: 4,
  },
  confirmPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: colors["secondary-fixed"],
    marginTop: spacing.sm,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors["primary-fixed"],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: spacing.md,
    width: "100%",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors["on-primary-fixed"],
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
