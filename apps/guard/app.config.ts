import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UniPark Guard",
  slug: "unipark-guard",
  scheme: "unipark-guard",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    backgroundColor: "#111317",
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.unipark.guard" },
  android: { package: "com.unipark.guard", adaptiveIcon: { backgroundColor: "#111317" } },
  plugins: ["expo-router", "expo-font", "expo-secure-store"],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: "unipark-guard" } },
});
