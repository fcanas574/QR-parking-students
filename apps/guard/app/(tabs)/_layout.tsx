import { Tabs, Redirect } from "expo-router";
import { useAuth, TopAppBar, BottomNavBar, colors } from "@parking/shared";
import { View } from "react-native";

export default function GuardTabsLayout() {
  const { isSignedIn, isReady, role } = useAuth();

  if (!isReady) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (role && role !== "security" && role !== "admin" && role !== "super_admin") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopAppBar />
      <Tabs
        tabBar={(props) => (
          <BottomNavBar
            tabs={[
              { icon: "qr_code_scanner", label: "Scan", route: "scanner" },
              { icon: "dashboard", label: "Status", route: "dashboard" },
              { icon: "map", label: "Map", route: "map" },
              { icon: "payments", label: "Log", route: "history" },
            ]}
            activeTab={props.state.routeNames[props.state.index]}
            onTabPress={(route) => props.navigation.navigate(route)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="scanner" />
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="history" />
      </Tabs>
    </View>
  );
}
