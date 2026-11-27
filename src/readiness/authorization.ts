import type { AuthCell, OperationalState } from "./types";

export interface RuntimeEnv {
  get(name: string): string | undefined;
}

export function nodeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  return { get: (name) => source[name] };
}

function cell(present: boolean, note: string, write: OperationalState = "AUTHORIZATION_REQUIRED"): AuthCell {
  return {
    resource: note.startsWith("GitHub") ? "GitHub" : note,
    read: present ? "VERIFIED" : "AUTHORIZATION_REQUIRED",
    write,
    execute: present ? "AUTHORIZED" : "AUTHORIZATION_REQUIRED",
    deploy: "AUTHORIZATION_REQUIRED",
    administer: "AUTHORIZATION_REQUIRED",
    note,
  };
}

export function authorizationMatrix(env: RuntimeEnv, githubPublic: boolean): AuthCell[] {
  const githubToken = Boolean(env.get("GITHUB_TOKEN") || env.get("GH_TOKEN"));
  const database = Boolean(env.get("DATABASE_URL") || env.get("NEON_DATABASE_URL"));
  const vercel = Boolean(env.get("VERCEL_TOKEN") || env.get("VERCEL"));
  const render = Boolean(env.get("RENDER_API_KEY"));
  const railway = Boolean(env.get("RAILWAY_TOKEN"));
  return [
    {
      resource: "GitHub public read",
      read: githubPublic ? "VERIFIED" : "BLOCKED",
      write: "BLOCKED",
      execute: githubPublic ? "AUTHORIZED" : "BLOCKED",
      deploy: "BLOCKED",
      administer: "BLOCKED",
      note: githubPublic
        ? "Unauthenticated or ambient public read succeeded for at least one canonical repository. Write, deploy, and administration are not included."
        : "Public GitHub read did not succeed during this scan.",
    },
    {
      resource: "GitHub write",
      read: githubToken ? "AUTHORIZED" : "AUTHORIZATION_REQUIRED",
      write: githubToken ? "AUTHORIZED" : "AUTHORIZATION_REQUIRED",
      execute: "AUTHORIZATION_REQUIRED",
      deploy: "AUTHORIZATION_REQUIRED",
      administer: "AUTHORIZATION_REQUIRED",
      note: githubToken
        ? "A token environment variable is present. Its value was not read into the report. This scan did not push commits."
        : "No GITHUB_TOKEN or GH_TOKEN is visible to this process. Pull requests are not created from the scanner.",
    },
    {
      resource: "Neon / PostgreSQL",
      read: database ? "REVIEW_REQUIRED" : "AUTHORIZATION_REQUIRED",
      write: "BLOCKED",
      execute: "BLOCKED",
      deploy: "BLOCKED",
      administer: "BLOCKED",
      note: database
        ? "A database URL is configured. Configuration is not a connection and is not permission to migrate. NeonPersistence still blocks generic writes."
        : "No DATABASE_URL or NEON_DATABASE_URL is visible. The draft audit schema is not applied.",
    },
    {
      resource: "Vercel",
      read: vercel ? "REVIEW_REQUIRED" : "AUTHORIZATION_REQUIRED",
      write: "AUTHORIZATION_REQUIRED",
      execute: "AUTHORIZATION_REQUIRED",
      deploy: "BLOCKED",
      administer: "AUTHORIZATION_REQUIRED",
      note: "Production deploy is not authorized by this subsystem.",
    },
    {
      resource: "Render",
      read: render ? "REVIEW_REQUIRED" : "AUTHORIZATION_REQUIRED",
      write: "AUTHORIZATION_REQUIRED",
      execute: "AUTHORIZATION_REQUIRED",
      deploy: "BLOCKED",
      administer: "AUTHORIZATION_REQUIRED",
      note: "No new Render service is created. GPU availability was not observed.",
    },
    {
      resource: "Railway",
      read: railway ? "REVIEW_REQUIRED" : "AUTHORIZATION_REQUIRED",
      write: "AUTHORIZATION_REQUIRED",
      execute: "AUTHORIZATION_REQUIRED",
      deploy: "BLOCKED",
      administer: "AUTHORIZATION_REQUIRED",
      note: "No Railway resources are created or billed from this scan.",
    },
    cell(false, "Repository and organization secrets", "BLOCKED"),
  ];
}
