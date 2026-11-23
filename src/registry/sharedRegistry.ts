/**
 * Shared registry read for Full-Build.
 * The document lives in iamfather420-ctrl/Autonomous-Registry.
 * This module does not copy the catalog and does not invent a second registry.
 */
export const SHARED_REGISTRY_REPOSITORY = "iamfather420-ctrl/Autonomous-Registry";
export const SHARED_REGISTRY_ITEM_PATH = "src/registry/proof/solvex-link.json";
export const SHARED_REGISTRY_CONTENTS_URL =
  "https://raw.githubusercontent.com/iamfather420-ctrl/Autonomous-Registry/main/src/registry/proof/solvex-link.json";

export interface SharedRegistryItem {
  name: string;
  title?: string;
  description?: string;
  meta?: { correlationId?: string; interface?: string };
}

export async function readSharedRegistryItem(
  fetchImpl: typeof fetch = fetch,
  url = process.env.SOLVEX_REGISTRY_ITEM_URL || SHARED_REGISTRY_CONTENTS_URL,
): Promise<{ ok: true; status: number; item: SharedRegistryItem } | { ok: false; status: number; item: null; error: string }> {
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    return { ok: false, status: response.status, item: null, error: `Registry read failed with HTTP ${response.status}.` };
  }
  const item = await response.json() as SharedRegistryItem;
  if (!item || item.name !== "solvex-link" || !item.meta?.correlationId) {
    return { ok: false, status: response.status, item: null, error: "Registry document is missing the intact solvex-link correlation id." };
  }
  return { ok: true, status: response.status, item };
}
