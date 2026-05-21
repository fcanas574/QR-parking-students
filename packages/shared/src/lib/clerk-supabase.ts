import { supabase } from "./supabase";

export async function exchangeClerkToken(clerkToken: string) {
  const { data, error } = await supabase.functions.invoke("exchange-token", {
    body: { clerkToken },
  });

  if (error) throw error;

  const { supabaseAccessToken } = data as { supabaseAccessToken: string };
  await supabase.auth.setSession({
    access_token: supabaseAccessToken,
    refresh_token: "",
  });
}
