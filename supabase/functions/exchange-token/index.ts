import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "clerk";
import { SignJWT } from "jose";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

const clerkClient = createClerkClient({
  secretKey: Deno.env.get("CLERK_SECRET_KEY")!,
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * The HS256 secret used by Supabase Auth to sign JWTs.
 * In local dev this is injected by the Supabase CLI.  In production it can be
 * set via `[edge_runtime.secrets]` in config.toml.
 */
function getJwtSecret(): string {
  const secret =
    Deno.env.get("SUPABASE_JWT_SECRET") ??
    Deno.env.get("SUPABASE_AUTH_JWT_SECRET") ??
    Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error(
      "JWT signing secret not found – set SUPABASE_JWT_SECRET",
    );
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_ISSUER = Deno.env.get("SUPABASE_URL")!;
const JWT_EXPIRY = "1h";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

interface TokenExchangeRequest {
  clerkToken: string;
}

interface TokenExchangeResponse {
  supabaseAccessToken: string;
  profileId: string;
  role: string;
  email: string;
}

/**
 * Verify the Clerk session token and extract the user identity.
 * Throws AuthError for invalid/expired tokens so the handler can return 401.
 */
async function verifyClerkToken(token: string) {
  const result = await clerkClient.verifyToken(token);

  if ("errors" in result && result.errors && result.errors.length > 0) {
    console.error("Clerk token errors:", result.errors);
    throw new AuthError(
      `Clerk token verification failed: ${result.errors.join(", ")}`,
    );
  }

  const data = "data" in result ? result.data : result;
  if (!data || !data.sub) {
    throw new AuthError("Clerk token missing subject claim");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // ---- Method guard ----
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- Parse body ----
  let body: TokenExchangeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { clerkToken } = body;
  if (!clerkToken) {
    return new Response(
      JSON.stringify({ error: "clerkToken is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // ---- Step 1: Verify Clerk token ----
    const data = await verifyClerkToken(clerkToken);

    const clerkId = data.sub as string;
    const role = (data.public_metadata?.role as string) ?? "student";
    const firstName = (data.first_name as string) ?? "";
    const lastName = (data.last_name as string) ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
    const email =
      (data.email_addresses?.[0]?.email_address as string) ?? "";

    // ---- Step 2: Upsert profile via RPC ----
    const { data: profileId, error: profileError } = await supabaseAdmin.rpc(
      "create_profile_if_not_exists",
      {
        p_clerk_id: clerkId,
        p_full_name: fullName,
        p_role: role,
        p_email: email,
      },
    );

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      throw new Error(`Profile upsert failed: ${profileError.message}`);
    }

    // ---- Step 3: Sign a Supabase-compatible JWT ----
    //
    // The RLS policies reference `auth.jwt()->>'sub'` as the clerk_id,
    // so we set `sub = clerkId`.  The token is signed with the same
    // HS256 secret that the Supabase Auth server uses.
    const secretKey = new TextEncoder().encode(JWT_SECRET);

    const supabaseAccessToken = await new SignJWT({
      email,
      role,
      user_metadata: { clerk_id: clerkId, role },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(clerkId)
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(secretKey);

    // ---- Respond ----
    const response: TokenExchangeResponse = {
      supabaseAccessToken,
      profileId,
      role,
      email,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Token exchange error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = err instanceof AuthError ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
});
