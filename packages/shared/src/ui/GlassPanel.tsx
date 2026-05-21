import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { glassStyle, borderRadius } from "../design/tokens";

interface GlassPanelProps extends ViewProps {
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassPanel({ glow, children, style, ...props }: GlassPanelProps) {
  return (
    <View
      style={[
        styles.panel,
        glow && styles.glow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...glassStyle,
    borderRadius: borderRadius.xl,
    padding: 24,
  },
  glow: {
    shadowColor: "rgba(54, 255, 196, 0.25)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
});
