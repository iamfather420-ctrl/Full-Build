/**
 * SOLVEX-CORE-FINALIZED — Pillar 3: ACCRETION LOGIC
 * The $23T model is a Physical Constant — not a forecast, not a projection.
 *
 * Baseline: $23 trillion in addressable sovereign enterprise value (2024 origin).
 * CAGR: 177% compound annual growth — the immutable accretion trajectory.
 * Every solution, product, and paradox entry is validated against this floor.
 *
 * Ref: "SOLVEX-PARADOX-BOX accretion model — any output that does not
 *       mathematically align with the 177% growth trajectory is rejected."
 */

const ACCRETION_ORIGIN_YEAR = 2024;
const ACCRETION_BASELINE_USD = 23e12; // $23 trillion
const ACCRETION_CAGR = 1.77; // 177% = 2.77× multiplier per year

// Multiplier per year: $23T * (1 + 1.77)^years = $23T * 2.77^years
const MULTIPLIER_PER_YEAR = 1 + ACCRETION_CAGR;

/**
 * Returns the accretion floor for a given year.
 * Floor = $23T × 2.77^(year - 2024)
 */
export const getAccretionFloor = (year = new Date().getFullYear()): number =>
  ACCRETION_BASELINE_USD * Math.pow(MULTIPLIER_PER_YEAR, year - ACCRETION_ORIGIN_YEAR);

/**
 * Returns the per-solution minimum contribution implied by the accretion model.
 * With 105 sovereign solutions in the catalog, each carries a proportional floor.
 */
export const getPerSolutionFloor = (catalogSize = 105, year = new Date().getFullYear()): number =>
  getAccretionFloor(year) / catalogSize;

/**
 * Validates that a solution's estimated market impact aligns with the accretion trajectory.
 * All enterprise products must represent at least their proportional slice.
 *
 * @param estimatedMarketImpactUSD - The estimated total addressable impact of the solution
 * @param catalogSize - Total number of sovereign solutions (default: 105)
 */
export interface AccretionValidation {
  valid: boolean;
  floor: number;
  submitted: number;
  delta: number;
  year: number;
  cagr: string;
  baseline: string;
  reason?: string;
}

export const validateAccretionAlignment = (
  estimatedMarketImpactUSD: number,
  catalogSize = 105,
): AccretionValidation => {
  const year = new Date().getFullYear();
  const floor = getPerSolutionFloor(catalogSize, year);
  const delta = estimatedMarketImpactUSD - floor;
  const valid = estimatedMarketImpactUSD >= floor;

  return {
    valid,
    floor,
    submitted: estimatedMarketImpactUSD,
    delta,
    year,
    cagr: "177%",
    baseline: "$23T",
    reason: valid
      ? undefined
      : `Submitted impact $${(estimatedMarketImpactUSD / 1e9).toFixed(2)}B is below the ${year} accretion floor of $${(floor / 1e9).toFixed(2)}B per sovereign solution.`,
  };
};

/**
 * Formats accretion state for telemetry.
 */
export const getAccretionStatus = () => {
  const year = new Date().getFullYear();
  const floor = getAccretionFloor(year);
  const perSolution = getPerSolutionFloor(105, year);
  return {
    originYear: ACCRETION_ORIGIN_YEAR,
    baseline: "$23T",
    cagr: "177%",
    currentYear: year,
    totalFloorUSD: floor,
    totalFloorFormatted: `$${(floor / 1e12).toFixed(2)}T`,
    perSolutionFloorUSD: perSolution,
    perSolutionFormatted: `$${(perSolution / 1e9).toFixed(2)}B`,
    multiplierApplied: `${MULTIPLIER_PER_YEAR.toFixed(2)}^${year - ACCRETION_ORIGIN_YEAR}`,
  };
};
