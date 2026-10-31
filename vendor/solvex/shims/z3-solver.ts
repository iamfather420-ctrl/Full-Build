export async function init(): Promise<never> {
  throw new Error("Z3 WASM solver is not bundled in this preview. Theorem scripts stay visible; proof execution stays fail-closed.");
}

export default { init };
