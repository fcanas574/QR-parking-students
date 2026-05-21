import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@parking/shared";
import { TopAppBar, BottomNavBar } from "@parking/shared";
import { View } from "react-native";
import { colors } from "@parking/shared";

export default function TabsLayout() {
  const { isSignedIn, isReady } = useAuth();

  if (!isReady) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopAppBar />
      <Tabs
        tabBar={(props) => (
          <BottomNavBar
            tabs={[
              { icon: "dashboard", label: "Status", route: "dashboard" },
              { icon: "map", label: "Map", route: "map" },
              { icon: "payments", label: "Permits", route: "permits" },
              { icon: "qr_code_scanner", label: "Access", route: "access" },
            ]}
            activeTab={props.state.routeNames[props.state.index]}
            onTabPress={(route) => props.navigation.navigate(route)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="permits" />
        <Tabs.Screen name="access" />
      </Tabs>
    </View>
  );
}
