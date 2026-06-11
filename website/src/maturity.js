/**
 * maturity.js — Web UI client utility layer
 * ------------------------------------------
 * Encodes, decodes, and translates precompiled 16-bit packed data nibbles.
 * Zero external dependencies or heavy file system access layers.
 */

/** 4 CSM categories stored as 4-bit nibbles in a 16-bit matMask. */
export const MATURITY_CATEGORIES = [
  { key: "sex",      label: "Sex & Nudity", shift: 0  },
  { key: "violence", label: "Violence",     shift: 4  },
  { key: "language", label: "Language",     shift: 8  },
  { key: "drugs",    label: "Drugs",        shift: 12 },
];

/** Labels for integer scores 0–5 (matching CSM scale). */
export const SEVERITY_LABELS = ["None", "Minimal", "Mild", "Moderate", "Strong", "Severe"];

/** CSS color class assignment handler matching application styles */
export function scoreCssClass(score) {
  const s = Math.round(Math.max(0, Math.min(5, score)));
  return `sev-${s}`;
}

/** Extract the 0–5 float score for a category from a 16-bit matMask. */
export function getScore(matMask, shift, precise) {
  return decodeNibble((matMask >>> shift) & 0xf);
}

/** Encode a 0–5 float into a 4-bit nibble layout (0.5-step precision) */
export function encodeNibble(value) {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return Math.min(15, Math.max(0, Math.round(Math.min(5, Math.max(0, v)) * 3)));
}

/** Decode a 4-bit nibble layout into an application float score */
export function decodeNibble(nibble) {
  return Math.min(15, Math.max(0, nibble & 0xf)) / 3;
}

/** Pack custom category arrays back down into a 16-bit integer mask */
export function packMatMask(sex, violence, language, drugs) {
  return (
    (encodeNibble(sex)      <<  0) |
    (encodeNibble(violence) <<  4) |
    (encodeNibble(language) <<  8) |
    (encodeNibble(drugs)    << 12)
  );
}

/** Read a 16-bit packed matMask back into distinct human-readable score metrics */
export function decodeMatMask(matMask) {
  const m = matMask >>> 0;
  return {
    sex:       decodeNibble((m >> 0)  & 0xf),
    violence:  decodeNibble((m >> 4)  & 0xf),
    language:  decodeNibble((m >> 8)  & 0xf),
    drugs:     decodeNibble((m >> 12) & 0xf),
  };
}