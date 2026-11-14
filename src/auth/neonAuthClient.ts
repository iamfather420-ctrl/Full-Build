import { createAuthClient } from "@neon/auth";

// This URL is the branch-specific Managed Neon Auth URL, including /neondb/auth.
const authUrl = (import.meta.env.VITE_NEON_AUTH_URL as string | undefined)
  // Local and protected preview builds can still render the app when only
  // production has a configured Vite environment variable.
  ?? "https://ep-silent-mode-b4j1qb27.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth";

export const neonAuthClient = createAuthClient(authUrl);
