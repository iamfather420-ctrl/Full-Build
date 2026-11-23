/**
 * Shared registry read for Full-Build.
 * The document lives in iamfather420-ctrl/Autonomous-Registry.
 * This module does not copy the catalog and does not invent a second registry.
 * The live catalog is the data path. GitHub contents is only the fallback.
 */
export const SHARED_REGISTRY_REPOSITORY = "iamfather420-ctrl/Autonomous-Registry";
export const SHARED_REGISTRY_ITEM_PATH = "src/registry/proof/solvex-link.json";
export const SHARED_REGISTRY_HTTP_ORIGIN = "https://autonomous-registry.vercel.app";
export const SHARED_REGISTRY_HTTP_ITEM_URL = `${SHARED_REGISTRY_HTTP_ORIGIN}/r/solvex-link.json`;
export const SHARED_REGISTRY_HTTP_INDEX_URL = `${SHARED_REGISTRY_HTTP_ORIGIN}/r/registry.json`;
export const SHARED_REGISTRY_CONTENTS_URL =
  "https://raw.githubusercontent.com/iamfather420-ctrl/Autonomous-Registry/main/src/registry/proof/solvex-link.json";

export interface SharedRegistryItem {
  name: string;
  title?: string;
  description?: string;
  meta?: { correlationId?: string; interface?: string; httpReadRouteStatus?: string };
}

export type SharedRegistryVia = "http-catalog" | "github-contents" | "override";

export type SharedRegistryRead =
  | { ok: true; status: number; item: SharedRegistryItem; url: string; via: SharedRegistryVia }
  | { ok: false; status: number; item: null; error: string; url: string; via: SharedRegistryVia | null };

function targets(explicit?: string): Array<{ url: string; via: SharedRegistryVia }> {
  const override = explicit || process.env.SOLVEX_REGISTRY_ITEM_URL;
  if (override) return [{ url: override, via: "override" }];
  return [
    { url: SHARED_REGISTRY_HTTP_ITEM_URL, via: "http-catalog" },
    { url: SHARED_REGISTRY_CONTENTS_URL, via: "github-contents" },
  ];
}

export async function readSharedRegistryItem(
  fetchImpl: typeof fetch = fetch,
  url?: string,
): Promise<SharedRegistryRead> {
  let last: SharedRegistryRead = {
    ok: false,
    status: 0,
    item: null,
    error: "No registry URL was attempted.",
    url: "",
    via: null,
  };
  for (const target of targets(url)) {
    try {
      const response = await fetchImpl(target.url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        last = {
          ok: false,
          status: response.status,
          item: null,
          error: `Registry read failed with HTTP ${response.status}.`,
          url: target.url,
          via: target.via,
        };
        continue;
      }
      const item = await response.json() as SharedRegistryItem;
      if (!item || item.name !== "solvex-link" || !item.meta?.correlationId) {
        last = {
          ok: false,
          status: response.status,
          item: null,
          error: "Registry document is missing the intact solvex-link correlation id.",
          url: target.url,
          via: target.via,
        };
        continue;
      }
      return { ok: true, status: response.status, item, url: target.url, via: target.via };
    } catch (error) {
      last = {
        ok: false,
        status: 0,
        item: null,
        error: error instanceof Error ? error.message : "Registry read threw.",
        url: target.url,
        via: target.via,
      };
    }
  }
  return last;
}

export async function readSharedRegistryIndex(
  fetchImpl: typeof fetch = fetch,
  url = process.env.SOLVEX_REGISTRY_INDEX_URL || SHARED_REGISTRY_HTTP_INDEX_URL,
): Promise<{ ok: true; status: number; url: string; names: string[]; hasProof: boolean } | { ok: false; status: number; url: string; error: string }> {
  try {
    const response = await fetchImpl(url, { headers: { accept: "application/json" } });
    if (!response.ok) {
      return { ok: false, status: response.status, url, error: `Registry index failed with HTTP ${response.status}.` };
    }
    const body = await response.json() as { items?: Array<{ name?: string }> };
    const names = Array.isArray(body.items) ? body.items.map((item) => String(item?.name ?? "")).filter(Boolean) : [];
    return { ok: true, status: response.status, url, names, hasProof: names.includes("solvex-link") };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: error instanceof Error ? error.message : "Registry index read threw.",
    };
  }
}
