import { useEffect, useState, useCallback } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { exchangeClerkToken } from "../lib/clerk-supabase";
import type { UserRole, Profile } from "../types";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const { isSignedIn, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user) {
      setIsReady(true);
      return;
    }

    async function setupSupabaseSession() {
      try {
        const token = await getToken();
        if (!token) return;

        await exchangeClerkToken(token);

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_id", user!.id)
          .single();

        setProfile(data as Profile | null);
      } catch (err) {
        console.error("Auth setup failed:", err);
      } finally {
        setIsReady(true);
      }
    }

    setupSupabaseSession();
  }, [isSignedIn, user?.id]);

  const role: UserRole | null = (profile?.role as UserRole) ?? null;

  const signOut = useCallback(async () => {
    await clerkSignOut();
    setProfile(null);
  }, [clerkSignOut]);

  return {
    isSignedIn: !!isSignedIn,
    isReady,
    user,
    profile,
    role,
    signOut,
  };
}
