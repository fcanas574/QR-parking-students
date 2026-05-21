import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import { syncEngine } from "../src/sync/syncEngine";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000 },
  },
});

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, token: string) {
    return SecureStore.setItemAsync(key, token);
  },
};

function AuthSyncGate() {
  const { isSignedIn } = useAuth();
  const initialSyncDone = useRef(false);

  // Initial sync: pull active permits into WatermelonDB when the user signs in.
  // On success, mark initialSyncDone so we never retry. Also push any stale
  // scans queued from a previous session, since NetInfo only fires on change.
  useEffect(() => {
    if (isSignedIn && !initialSyncDone.current) {
      syncEngine
        .initialSync()
        .then(() => {
          initialSyncDone.current = true;
        })
        .catch((err) => {
          console.error("[SyncEngine] initialSync failed:", err);
        })
        .finally(() => {
          syncEngine.pushQueuedScans().catch(() => {});
        });
    }
  }, [isSignedIn]);

  // Connectivity listener: push queued scans when the network comes back
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && isSignedIn) {
        syncEngine.pushQueuedScans().catch((err) => {
          console.error("[SyncEngine] pushQueuedScans failed:", err);
        });
      }
    });

    return () => unsubscribe();
  }, [isSignedIn]);

  // AppState listener: attempt push when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && isSignedIn) {
        syncEngine.pushQueuedScans().catch((err) => {
          console.error("[SyncEngine] foreground push failed:", err);
        });
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => subscription.remove();
  }, [isSignedIn]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora: require("../assets/fonts/Sora-Regular.ttf"),
    SoraBold: require("../assets/fonts/Sora-Bold.ttf"),
    SoraSemiBold: require("../assets/fonts/Sora-SemiBold.ttf"),
    MaterialSymbolsOutlined: require("../assets/fonts/MaterialSymbolsOutlined.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <AuthSyncGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
