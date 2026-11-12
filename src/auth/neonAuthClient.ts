import { createAuthClient } from "@neondatabase/auth";

// This URL is the branch-specific Managed Neon Auth URL, including /neondb/auth.
const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
if (!authUrl) {
  throw new Error("VITE_NEON_AUTH_URL must be configured for Neon Auth.");
}

export const neonAuthClient = createAuthClient(authUrl);
