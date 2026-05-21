// Declare Expo's EAS-build-time environment variable convention.
// In the Expo / Metro bundler, `process.env.EXPO_PUBLIC_*` values are
// inlined at build time, so this declaration is enough for type-checking
// without pulling in all of @types/node.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
