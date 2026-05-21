import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { colors } from "../design/tokens";
import { MaterialSymbol } from "./MaterialSymbol";

interface TopAppBarProps {
  onAvatarPress?: () => void;
  avatarUrl?: string;
  hasNotifications?: boolean;
  onNotificationsPress?: () => void;
}

export function TopAppBar({
  onAvatarPress,
  avatarUrl,
  hasNotifications,
  onNotificationsPress,
}: TopAppBarProps) {
  return (
    <View style={styles.container}>
      {/* Leading: Avatar */}
      <Pressable
        onPress={onAvatarPress}
        style={styles.avatarContainer}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <MaterialSymbol name="person" size={18} color={colors["primary-fixed-dim"]} />
        )}
      </Pressable>

      {/* Brand */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandText}>UniPark</Text>
      </View>

      {/* Trailing: Notifications */}
      <Pressable onPress={onNotificationsPress} style={styles.notifContainer}>
        <MaterialSymbol name="notifications" size={24} color={colors["primary-fixed-dim"]} />
        {hasNotifications && <View style={styles.notifDot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: "rgba(17, 19, 23, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors["surface-container"],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(132, 148, 149, 0.5)",
    overflow: "hidden",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  brandContainer: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -50 }],
  },
  brandText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors["primary-fixed-dim"],
    fontFamily: "Sora",
  },
  notifContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors["secondary-fixed"],
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
});
