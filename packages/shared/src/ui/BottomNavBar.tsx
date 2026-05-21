import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, borderRadius } from "../design/tokens";
import { MaterialSymbol } from "./MaterialSymbol";

interface Tab {
  icon: string;
  label: string;
  route: string;
}

interface BottomNavBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (route: string) => void;
}

export function BottomNavBar({ tabs, activeTab, onTabPress }: BottomNavBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.route === activeTab;
        return (
          <Pressable
            key={tab.route}
            onPress={() => onTabPress(tab.route)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <MaterialSymbol
              name={tab.icon}
              size={24}
              color={isActive ? colors["secondary-fixed"] : colors["on-surface-variant"]}
              filled={isActive}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 80,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(30, 32, 36, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  activeTab: {
    backgroundColor: "rgba(54, 255, 196, 0.2)",
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    opacity: 0.6,
    marginTop: 4,
  },
  activeLabel: {
    color: colors["secondary-fixed"],
    opacity: 1,
  },
});
