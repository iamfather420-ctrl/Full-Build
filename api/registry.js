import { readLiveRegistry } from '../src/registry/liveRegistry.mjs';

export default async function handler(_req, res) {
  const registry = await readLiveRegistry();
  res.status(registry.connected ? 200 : 503).json(registry);
}
