/**
 * maturity.js — Shared IMDb parentsGuide severity computation
 * ------------------------------------------------------------
 * Single source of truth for all severity tuning knobs and the
 * computeSeverity / parseMaturityResponse functions.
 *
 * Imported by:
 *   - scrape.js          (Node/ESM)
 *   - MovieModal.vue     (Vite/ESM, via @/maturity.js or relative path)
 *
 * When you adjust a tuning constant here it automatically takes effect
 * in both the scraper (run with --recompute-mat to rebuild masks) and
 * the live UI without any other changes.
 */

// ─── API category keys ─────────────────────────────────────────────────────────

/** Maps IMDb API category strings to bitmask shift positions (scraper use). */
export const API_CAT_TO_SHIFT = {
  "SEXUAL_CONTENT":             0,  // sexAndNudity
  "VIOLENCE":                   2,  // violenceAndGore
  "PROFANITY":                  4,  // profanity
  "ALCOHOL_DRUGS":              6,  // alcoholDrugsAndSmoking
  "FRIGHTENING_INTENSE_SCENES": 8,  // frighteningScenes
};

/** Maps IMDb API category strings to MATURITY_CATEGORIES key (UI use). */
export const API_CAT_TO_KEY = {
  "SEXUAL_CONTENT":             "sexAndNudity",
  "VIOLENCE":                   "violenceAndGore",
  "PROFANITY":                  "profanity",
  "ALCOHOL_DRUGS":              "alcoholDrugsAndSmoking",
  "FRIGHTENING_INTENSE_SCENES": "frighteningScenes",
};

// ─── Severity tuning knobs ─────────────────────────────────────────────────────

/** Severity levels as numeric indices 0–3. */
const SEV_INDEX = { none: 0, mild: 1, moderate: 2, severe: 3 };

/**
 * How many standard deviations above the mean to bias toward.
 * Rationale: a precautionary parental guide should lean toward the upper bound
 * of what voters reported. 0.5 is conservative; 1.0 is aggressive.
 */
export const UPPER_BIAS_K = 0.6;

/**
 * Pseudo-count for the Bayesian prior.
 * Low-vote movies regress toward PRIOR_MEAN rather than being pinned by a
 * handful of troll votes. Tune upward for more regression on noisy titles.
 */
export const PRIOR_VOTES = 10;

/**
 * Prior belief about the baseline severity for an unknown title (0–3 scale).
 * 1.0 = "mild" — conservative starting point before any votes are observed.
 */
export const PRIOR_MEAN = 1.5;

/**
 * Per-category per-year leniency drift correction applied for post-2000 titles.
 * Positive = voters have become more permissive over time → we correct upward.
 * Set a category to 0 to disable its correction.
 */
export const YEAR_DRIFT_BY_CAT = {
  "SEXUAL_CONTENT":             0.012, // nudity tolerance has drifted most visibly
  "VIOLENCE":                   0.004, // violence tolerance drifts slowly
  "PROFANITY":                  0.008, // language norms have relaxed noticeably
  "ALCOHOL_DRUGS":              0.005,
  "FRIGHTENING_INTENSE_SCENES": 0.003, // least drift — fear is fairly universal
};

/**
 * Additive upward nudge for categories where false negatives matter more to
 * parents (e.g. violence, frightening content).
 */
export const CATEGORY_CAUTION = {
  "SEXUAL_CONTENT":             0.00,
  "VIOLENCE":                   0.08,
  "PROFANITY":                  0.00,
  "ALCOHOL_DRUGS":              0.03,
  "FRIGHTENING_INTENSE_SCENES": 0.00,
};

/**
 * Expected "genre default" severity per category on the 0–3 scale.
 * Applied at 0.5× weight to anchor cross-genre comparisons without
 * overwhelming actual vote data.
 * Positive offset = this genre typically scores higher on that category.
 *
 * Keys are genre bitmask values matching the GENRES bitmask in movies.js.
 */
export const GENRE_BASELINE_OFFSETS = {
  [1 << 16]: { SEXUAL_CONTENT:  0.40, VIOLENCE: -0.20 },                           // Romance
  [1 << 12]: { VIOLENCE:  0.50, FRIGHTENING_INTENSE_SCENES:  0.60 },               // Horror
  [1 <<  0]: { VIOLENCE:  0.35 },                                                   // Action
  [1 <<  2]: { SEXUAL_CONTENT: -0.30, VIOLENCE: -0.25, FRIGHTENING_INTENSE_SCENES: -0.15 }, // Animation
  [1 <<  8]: { SEXUAL_CONTENT: -0.25, VIOLENCE: -0.20, PROFANITY: -0.20 },         // Family
  [1 <<  5]: { VIOLENCE:  0.25, ALCOHOL_DRUGS:  0.15 },                            // Crime
  [1 <<  7]: { SEXUAL_CONTENT:  0.10 },                                             // Drama
};

// ─── Core severity computation ─────────────────────────────────────────────────

/**
 * Compute a robust, bias-corrected severity score for a single IMDb category.
 *
 * Steps:
 *   1. Bayesian smoothing — blend observed votes with a neutral prior to
 *      suppress troll noise on low-vote titles.
 *   2. Weighted mean + variance on the 0–3 scale.
 *   3. Upper-bias: score = mean + K × stddev
 *      (precautionary: lean toward what the top portion of voters reported).
 *   4. Year-drift correction: counteract growing voter leniency on post-2000 titles.
 *   5. Genre-baseline correction: normalise for genre-typical severity so a
 *      Romance movie's nudity score is comparable to an Action movie's.
 *   6. Category-caution nudge: small upward push on high-stakes categories.
 *   7. Clamp to [0, 3] and round to integer.
 *
 * Returns null when there are no usable votes.
 *
 * @param {Array}        severityBreakdowns  { severityLevel, voteCount }[]
 * @param {string}       category            IMDb API key, e.g. "VIOLENCE"
 * @param {number|null}  year                Title release year (or null)
 * @param {number}       genreMask           Genre bitmask (from movies.js GENRES)
 * @returns {number|null}                    Integer 0–3, or null
 */
export function computeSeverity(severityBreakdowns, category, year, genreMask) {
  if (!Array.isArray(severityBreakdowns) || severityBreakdowns.length === 0) return null;

  // 1. Collect raw vote counts per level
  const counts = { none: 0, mild: 0, moderate: 0, severe: 0 };
  let totalObserved = 0;
  for (const { severityLevel, voteCount } of severityBreakdowns) {
    if (!(severityLevel in counts)) continue;
    const v = Math.max(0, voteCount || 0);
    counts[severityLevel] += v;
    totalObserved += v;
  }
  if (totalObserved === 0) return null;

  // 2. Bayesian smoothing: blend with uniform prior over PRIOR_VOTES pseudo-counts
  const priorPerLevel = PRIOR_VOTES / 4;
  const smoothed = {};
  let totalSmoothed = 0;
  for (const lvl of ["none", "mild", "moderate", "severe"]) {
    smoothed[lvl] = counts[lvl] + priorPerLevel;
    totalSmoothed += smoothed[lvl];
  }

  // 3. Weighted mean and variance on 0–3 scale
  let mean = 0;
  for (const [lvl, cnt] of Object.entries(smoothed)) {
    mean += (cnt / totalSmoothed) * SEV_INDEX[lvl];
  }
  let variance = 0;
  for (const [lvl, cnt] of Object.entries(smoothed)) {
    variance += (cnt / totalSmoothed) * Math.pow(SEV_INDEX[lvl] - mean, 2);
  }

  // 4. Upper-bias: score = mean + K * stddev
  // A movie where 60% vote severe is not pulled to moderate by the minority of
  // none/mild votes. Conceptually this is a one-sided confidence bound.
  let score = mean + UPPER_BIAS_K * Math.sqrt(variance);

  // 5. Year-drift correction
  if (year != null && year > 2000) {
    score += (YEAR_DRIFT_BY_CAT[category] ?? 0) * (year - 2000);
  }

  // 6. Genre-baseline correction (dampened 0.5×)
  // Average the applicable genre offsets for multi-genre titles.
  let totalGenreOffset = 0;
  let genreOffsetCount = 0;
  for (const [bitStr, offsets] of Object.entries(GENRE_BASELINE_OFFSETS)) {
    if ((genreMask & Number(bitStr)) !== 0 && offsets[category] != null) {
      totalGenreOffset += offsets[category];
      genreOffsetCount++;
    }
  }
  if (genreOffsetCount > 0) {
    score += (totalGenreOffset / genreOffsetCount) * 0.5;
  }

  // 7. Category-caution nudge
  score += CATEGORY_CAUTION[category] ?? 0;

  // 8. Clamp to [0, 3] and round
  return Math.min(3, Math.max(0, Math.round(score)));
}

/**
 * Parse a raw IMDb parentsGuide API response into a 10-bit maturity bitmask.
 *
 * Bit layout: bits 0-1 = Nudity, 2-3 = Violence, 4-5 = Profanity,
 *             6-7 = Substances, 8-9 = Frightening  (2 bits each, values 0–3)
 *
 * @param {object}       data       Raw API response: { parentsGuide: [...] }
 * @param {number|null}  year       Release year for drift correction (or null)
 * @param {number}       genreMask  Genre bitmask for genre correction (or 0)
 * @returns {number|null}           10-bit integer, or null if nothing parseable
 */
export function parseMaturityResponse(data, year = null, genreMask = 0) {
  const items = data?.parentsGuide;
  if (!Array.isArray(items) || items.length === 0) return null;

  let mat = 0;
  let anyFound = false;
  for (const item of items) {
    const shift = API_CAT_TO_SHIFT[item.category];
    if (shift == null) continue;
    const sev = computeSeverity(item.severityBreakdowns, item.category, year, genreMask);
    if (sev != null) {
      mat |= (sev & 3) << shift;
      anyFound = true;
    }
  }
  return anyFound ? mat : null;
}

/**
 * Original simple weighted-average severity (kept for regression testing).
 * @deprecated Use computeSeverity() instead.
 * @param {Array} severityBreakdowns
 * @returns {number|null}
 */
export function weightedSeverityLegacy(severityBreakdowns) {
  const SEV_WEIGHT = { none: 1, mild: 2, moderate: 3, severe: 4 };
  if (!Array.isArray(severityBreakdowns) || severityBreakdowns.length === 0) return null;
  let total = 0, wsum = 0;
  for (const { severityLevel, voteCount } of severityBreakdowns) {
    const w = SEV_WEIGHT[severityLevel];
    if (w == null) continue;
    total += (voteCount || 0);
    wsum  += (voteCount || 0) * w;
  }
  if (total === 0) return null;
  return Math.round(0.2 + wsum / total) - 1;
}