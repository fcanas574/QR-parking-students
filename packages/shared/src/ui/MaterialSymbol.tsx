import React from "react";
import { Text, StyleSheet } from "react-native";

interface MaterialSymbolProps {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: any;
}

const iconMap: Record<string, string> = {
  person: "",
  notifications: "",
  dashboard: "",
  map: "",
  payments: "",
  qr_code_scanner: "",
  directions_car: "",
  verified: "",
  location_on: "",
  bar_chart: "",
  more_horiz: "",
  campaign: "",
  warning: "",
  chevron_right: "",
  nfc: "",
  emergency: "",
};

export function MaterialSymbol({
  name,
  size = 24,
  color = "#e2e2e8",
  filled = false,
  style,
}: MaterialSymbolProps) {
  const icon = iconMap[name] ?? name;
  return (
    <Text
      style={[
        styles.icon,
        {
          fontSize: size,
          color,
          fontVariationSettings: `'FILL' ${filled ? 1 : 0}`,
        },
        style,
      ]}
    >
      {icon}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: "MaterialSymbolsOutlined",
  },
});
