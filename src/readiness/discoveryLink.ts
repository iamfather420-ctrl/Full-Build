export interface DiscoveryInterface {
  repository: string;
  httpStatus: number;
  routes: readonly string[];
  readsLanguageRepository: boolean;
}

export function assessDiscoveryInterface(descriptor: DiscoveryInterface): { state: "BLOCKED"; reason: string } {
  if (descriptor.httpStatus !== 200) {
    return {
      state: "BLOCKED",
      reason: `${descriptor.repository} returned HTTP ${descriptor.httpStatus}. No source retrieval was attempted.`,
    };
  }
  if (!descriptor.readsLanguageRepository) {
    return {
      state: "BLOCKED",
      reason: `${descriptor.repository} does not read the language repository. Routes ${descriptor.routes.join(", ") || "(none)"} are not a language-acquisition path.`,
    };
  }
  return {
    state: "BLOCKED",
    reason: "A language-repository reader is still not an admission or training authorization.",
  };
}
