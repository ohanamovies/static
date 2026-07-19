export const DEFAULT_MATURITY_PROFILES = [
  { id: "adults", label: "Adults", description: "No maturity limits", values: [-1, -1, -1, -1], builtIn: true },
  { id: "me", label: "Me", description: "Your personal saved limits", values: [-1, -1, -1, -1], builtIn: true },
  { id: "family", label: "Family", description: "Balanced shared viewing", values: [2, 3, 2, 2], builtIn: true },
  { id: "kids", label: "With kids", description: "Stricter family-safe browsing", values: [1, 2, 1, 1], builtIn: true },
];

// Backwards-compatible export for older components/imports.
export const MATURITY_PROFILES = DEFAULT_MATURITY_PROFILES;

export function normalizeMaturityValues(values = []) {
  return DEFAULT_MATURITY_PROFILES[0].values.map((_, i) => {
    const numeric = Number(values?.[i]);
    if (!Number.isFinite(numeric) || numeric < 0) return -1;
    return Math.min(5, Math.max(0, Math.round(numeric)));
  });
}

export function normalizeMaturityProfiles(profiles, legacyValues = [-1, -1, -1, -1]) {
  const incoming = Array.isArray(profiles) ? profiles : [];
  const byId = new Map(incoming
    .filter(profile => profile?.id && profile?.label)
    .map(profile => [profile.id, {
      ...profile,
      values: normalizeMaturityValues(profile.values),
      builtIn: Boolean(profile.builtIn),
    }]));

  const builtIns = DEFAULT_MATURITY_PROFILES.map(defaultProfile => ({
    ...defaultProfile,
    ...(byId.get(defaultProfile.id) ?? {}),
    values: defaultProfile.id === "me"
      ? normalizeMaturityValues(byId.get("me")?.values ?? legacyValues)
      : normalizeMaturityValues(byId.get(defaultProfile.id)?.values ?? defaultProfile.values),
    builtIn: true,
  }));

  const customProfiles = incoming
    .filter(profile => profile?.id && profile?.label && !DEFAULT_MATURITY_PROFILES.some(defaultProfile => defaultProfile.id === profile.id))
    .map(profile => ({
      id: profile.id,
      label: String(profile.label).trim().slice(0, 40) || "Custom profile",
      description: profile.description || "Custom viewing limits",
      values: normalizeMaturityValues(profile.values),
      builtIn: false,
    }));

  return [...builtIns, ...customProfiles];
}

export function profileById(profiles = DEFAULT_MATURITY_PROFILES, id = "adults") {
  return profiles.find(profile => profile.id === id) ?? profiles[0] ?? DEFAULT_MATURITY_PROFILES[0];
}

export function profileLabel(profiles = DEFAULT_MATURITY_PROFILES, id = "adults") {
  return profileById(profiles, id)?.label ?? "Maturity profile";
}

export function activeMaturityProfileId(maxMaturityCat = []) {
  const current = maxMaturityCat.join(",");
  const preset = DEFAULT_MATURITY_PROFILES.find(profile => profile.values?.join(",") === current);
  if (preset) return preset.id;
  return maxMaturityCat.some(v => v >= 0) ? "me" : "adults";
}

export function activeMaturityProfileLabel(maxMaturityCat = []) {
  const id = activeMaturityProfileId(maxMaturityCat);
  return profileLabel(DEFAULT_MATURITY_PROFILES, id);
}
