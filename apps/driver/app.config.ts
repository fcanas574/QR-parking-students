import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UniPark Driver",
  slug: "unipark-driver",
  scheme: "unipark-driver",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    backgroundColor: "#111317",
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.unipark.driver" },
  android: { package: "com.unipark.driver", adaptiveIcon: { backgroundColor: "#111317" } },
  plugins: ["expo-router", "expo-font", "expo-secure-store"],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: "unipark-driver" } },
});
