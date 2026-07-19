import { defineStore } from "pinia";
import { ref, computed, shallowRef } from "vue";
import Fuse from "fuse.js";
import { MATURITY_CATEGORIES, getScore } from "@/maturity.js";
import { DEFAULT_MATURITY_PROFILES, normalizeMaturityProfiles, normalizeMaturityValues, profileById, profileLabel } from "@/lib/maturityProfiles.js";

// ── Genres: exact IMDb strings as keys, bitmask values ───────────────────────
export const GENRES = {
  "Action":      1 << 0,
  "Adventure":   1 << 1,
  "Animation":   1 << 2,
  "Biography":   1 << 3,
  "Comedy":      1 << 4,
  "Crime":       1 << 5,
  "Documentary": 1 << 6,
  "Drama":       1 << 7,
  "Family":      1 << 8,
  "Fantasy":     1 << 9,
  "Film-Noir":   1 << 10,
  "History":     1 << 11,
  "Horror":      1 << 12,
  "Music":       1 << 13,
  "Musical":     1 << 14,
  "Mystery":     1 << 15,
  "Romance":     1 << 16,
  "Sci-Fi":      1 << 17,
  "Sport":       1 << 18,
  "Thriller":    1 << 19,
  "War":         1 << 20,
  "Western":     1 << 21,
};

export const GENRE_LABELS = Object.keys(GENRES);


// ── Spain streaming providers ─────────────────────────────────────────────────
export const PROVIDERS = [
  { bit: 1 << 0,  id: 8,   name: "Netflix" },
  { bit: 1 << 1,  id: 119, name: "Prime Video" },
  { bit: 1 << 2,  id: 337, name: "Disney+" },
  { bit: 1 << 3,  id: 384, name: "Max" },
  { bit: 1 << 4,  id: 149, name: "Movistar+" },
  { bit: 1 << 5,  id: 63,  name: "Filmin" },
  { bit: 1 << 6,  id: 350, name: "Apple TV+" },
  { bit: 1 << 7,  id: 531, name: "Paramount+" },
  { bit: 1 << 8,  id: 567, name: "SkyShowtime" },
  { bit: 1 << 9,  id: 541, name: "Atresplayer" },
  { bit: 1 << 10, id: 2,   name: "Apple TV" },
  { bit: 1 << 11, id: 11,  name: "MUBI" },
];

// ── Store ─────────────────────────────────────────────────
export const useMovieStore = defineStore("movies", () => {
  const allMovies = shallowRef([]);
  const loading = ref(false);
  const error = ref(null);

  // Filters
  const searchQuery = ref("");
  const selectedGenres = ref(new Set());
  const selectedProviders = ref(0);       // bitmask of configured services from Settings
  const availabilityMode = ref("my-services"); // my-services | any; temporary Discover choice
  const titleType = ref("both");          // both | movies | tv; browsing only, search stays broad
  const minRating = ref(0);
  // Session-only baseline safety: visible and easy to toggle off, but resets on reload/new session.
  const safeBrowsingEnabled = ref(true);
  // Per-category max score: index matches MATURITY_CATEGORIES order (sex, violence, language, drugs)
  // -1 = no filter active; 0–5 = max allowed rounded score
  const maxMaturityCat = ref([-1, -1, -1, -1]);
  const activeMaturityProfileId = ref("adults");
  const maturityProfiles = ref(normalizeMaturityProfiles());

  // Sex & Nudity is shift 0; scale 0–5 → invert so lower score = higher sort weight
  const maturityScore = (a) => {
    const sexScore = getScore(a.mat, 0);
    return isNaN(sexScore) ? 0.000001 : Math.max(0.000001, 1 - (sexScore / 3.5) ** 2);
  };
  const pop         = (a) => a.pop || 1;
  const rating      = (a) => a.r || 6;
  const popularPop  = (a) => a.pop > 6 ? 1 : 0.0001;

  const makeSorter = (getPop, getRating) =>
    (a, b) => getPop(b) * getRating(b) * maturityScore(b)
             - getPop(a) * getRating(a) * maturityScore(a);

  const byPopRating = makeSorter(pop, rating);
  const byRated     = makeSorter(popularPop, rating);
  const byTrending  = makeSorter(pop, () => 1);

  let fuse = null;

  const MOVIES_JSON_URLS = ["movies.json", "https://ohana.tv/movies.json"];

  async function fetchMoviesJson() {
    const errors = [];

    for (const url of MOVIES_JSON_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        errors.push(`${url}: ${e.message}`);
      }
    }

    throw new Error(errors.join("; "));
  }

  // ── Load data ─────────────────────────────────────────────
  async function loadMovies() {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchMoviesJson();
      allMovies.value = data.movies || generateMockMovies();
    } catch (e) {
      console.warn("Could not load movies.json from local or ohana.tv, using mock data:", e.message);
      allMovies.value = generateMockMovies();
    } finally {
      loading.value = false;
      fuse = new Fuse(allMovies.value, {
        keys: ["t","ts"],
        threshold: 0.38,
        includeScore: true,
        minMatchCharLength: 3,
        ignoreLocation: true,
      });
    }
  }

  // ── Filtered + sorted movies ──────────────────────────────
  const filteredMovies = computed(() => {
    const query = searchQuery.value.trim();

    let scored;
    if (query.length >= 2 && fuse) {
      scored = fuse.search(query, { limit: 2000 })
        .map(r => ({ item: r.item, score: r.score ?? 1 }));
    } else {
      scored = allMovies.value.map(item => ({ item, score: 0 }));
    }

    let pool = scored;

    // When there's an active search query, ignore all other filters
    // (genre, provider, rating, maturity) and just return the search results.
    if (query.length >= 2) {
      pool.sort((a, b) => {
        return (a.score || 0.001) * pop(b.item) * maturityScore(b.item) - (b.score || 0.001) * pop(a.item) * maturityScore(a.item);
      });
      return pool.map(({ item }) => item);
    }

    // No search query: hide movies without a poster
    pool = pool.filter(({ item }) => item.p);
    // Baseline safety hides very explicit sex/nudity unless the session-only Safe chip is off.
    if (safeBrowsingEnabled.value) {
      pool = pool.filter(({ item }) => (getScore(item.mat, 0) || 0) < 4.5);
    }

    if (titleType.value === "movies") {
      pool = pool.filter(({ item }) => item.s !== 1);
    } else if (titleType.value === "tv") {
      pool = pool.filter(({ item }) => item.s === 1);
    }

    if (selectedGenres.value.size > 0) {
      let mask = 0;
      for (const g of selectedGenres.value) mask |= (GENRES[g] ?? 0);
      pool = pool.filter(({ item }) => item.g & mask);
    }

    if (availabilityMode.value === "my-services" && selectedProviders.value !== 0) {
      const pMask = selectedProviders.value;
      pool = pool.filter(({ item }) => item.prov & pMask);
    }

    if (minRating.value > 0) {
      pool = pool.filter(({ item }) => item.r >= minRating.value);
    }

    const catThresholds = maxMaturityCat.value;
    if (catThresholds.some(t => t >= 0)) {
      pool = pool.filter(({ item }) => {
        if (item.mat === undefined) return false;
        for (let i = 0; i < MATURITY_CATEGORIES.length; i++) {
          const threshold = catThresholds[i];
          if (threshold < 0) continue;
          const score = getScore(item.mat, MATURITY_CATEGORIES[i].shift);
          if ((Number.isFinite(score) ? Math.round(score) : 6) > threshold) return false;
        }
        return true;
      });
    }

    return pool.map(({ item }) => item);
  });

  // ── Rows for the Netflix-like grid ────────────────────────
  const movieRows = computed(() => {
    const pool = filteredMovies.value;
    if (pool.length === 0) return [];

    const rows = [];

    const ROW_MAX = 500;

    const activeProfileLabel = profileLabel(maturityProfiles.value, activeMaturityProfileId.value);

    const topRated = [...pool].sort( byRated ).slice(0, ROW_MAX);
    if (topRated.length >= 4)
      rows.push({ id: "recommended", label: `Recommended for ${activeProfileLabel}`, movies: topRated });

    const hiddenGems = [...pool]
      .filter((m) => (m.r || 0) >= 7 && (m.pop || 0) < 30)
      .sort(byRated)
      .slice(0, ROW_MAX);

    const trending = [...pool].sort( byTrending ).slice(0, ROW_MAX);
    if (trending.length >= 4)
      rows.push({ id: "popular", label: "Popular now", movies: trending });

    const providerRows = PROVIDERS
      .filter((prov) => !selectedProviders.value || (selectedProviders.value & prov.bit))
      .map((prov) => {
        const provMovies = pool
          .filter((m) => m.prov & prov.bit)
          .sort(byPopRating)
          .slice(0, ROW_MAX);
        return { prov, provMovies };
      })
      .filter(({ provMovies }) => provMovies.length >= 4)
      .map(({ prov, provMovies }) => ({ id: `prov-${prov.id}`, label: `Available on ${prov.name}`, movies: provMovies }));

    if (selectedProviders.value) rows.push({ id: "included-services", label: "Available on your services", movies: [...pool].filter((m) => m.prov & selectedProviders.value).sort(byPopRating).slice(0, ROW_MAX) }, ...providerRows);
    if (hiddenGems.length >= 4) rows.push({ id: "hidden-gems", label: "Hidden gems", movies: hiddenGems });

    for (const [genre, mask] of Object.entries(GENRES)) {
      const genreMovies = pool
        .filter((m) => m.g & mask)
        .sort(byPopRating)
        .slice(0, ROW_MAX);
      if (genreMovies.length >= 4)
        rows.push({ id: `genre-${genre}`, label: genre, movies: genreMovies });
    }

    if (!selectedProviders.value) rows.push(...providerRows);

    return diversifyRowStarts(rows);
  });

  function movieKey(movie) {
    return movie?.id || `${movie?.t || ""}-${movie?.y || ""}`.toLowerCase();
  }

  function diversifyRowStarts(rows) {
    const seenPreviousRows = new Set();

    return rows.map((row) => {
      const fresh = [];
      const repeated = [];

      for (const movie of row.movies) {
        (seenPreviousRows.has(movieKey(movie)) ? repeated : fresh).push(movie);
      }

      const movies = [...fresh, ...repeated];
      for (const movie of row.movies) seenPreviousRows.add(movieKey(movie));

      return { ...row, movies };
    });
  }

  // ── Filter helpers ────────────────────────────────────────
  function toggleGenre(g) {
    const s = new Set(selectedGenres.value);
    s.has(g) ? s.delete(g) : s.add(g);
    selectedGenres.value = s;
  }

  function toggleProvider(bit) {
    selectedProviders.value ^= bit;
  }

  function setMaxMaturityCat(catIndex, level) {
    if (catIndex < 0 || catIndex >= MATURITY_CATEGORIES.length) return;
    const arr = [...maxMaturityCat.value];
    arr[catIndex] = normalizeMaturityValues(arr.map((value, i) => i === catIndex ? level : value))[catIndex];
    maxMaturityCat.value = arr;
    activeMaturityProfileId.value = "me";
    updateMaturityProfile("me", { values: arr });
  }

  function setMaxMaturityCats(values, profileId = "me") {
    const next = normalizeMaturityValues(values);
    maxMaturityCat.value = next;
    activeMaturityProfileId.value = profileId;
    if (profileId === "me") updateMaturityProfile("me", { values: next });
  }

  function setMaturityProfiles(profiles, legacyValues) {
    maturityProfiles.value = normalizeMaturityProfiles(profiles, legacyValues);
    const activeProfile = profileById(maturityProfiles.value, activeMaturityProfileId.value);
    maxMaturityCat.value = normalizeMaturityValues(activeProfile.values);
  }

  function updateMaturityProfile(id, patch) {
    maturityProfiles.value = normalizeMaturityProfiles(
      maturityProfiles.value.map(profile => profile.id === id ? { ...profile, ...patch } : profile)
    );
  }

  function addMaturityProfile(profile) {
    if (!profile?.id || !profile?.label) return;
    maturityProfiles.value = normalizeMaturityProfiles([...maturityProfiles.value, { ...profile, builtIn: false }]);
    selectMaturityProfile(profile.id);
  }

  function removeMaturityProfile(id) {
    const target = profileById(maturityProfiles.value, id);
    if (!target || target.builtIn) return;
    maturityProfiles.value = normalizeMaturityProfiles(maturityProfiles.value.filter(profile => profile.id !== id));
    if (activeMaturityProfileId.value === id) selectMaturityProfile("me");
  }

  function selectMaturityProfile(id) {
    const profile = profileById(maturityProfiles.value, id);
    activeMaturityProfileId.value = profile.id;
    maxMaturityCat.value = normalizeMaturityValues(profile.values);
  }

  function clearMaturityFilters() {
    selectMaturityProfile("adults");
  }

  function clearFilters() {
    searchQuery.value = "";
    selectedGenres.value = new Set();
    // Provider selections are permanent account settings (“my services”), not
    // a throwaway Discover filter. Keep them intact when clearing the session.
    titleType.value = "both";
    minRating.value = 0;
    availabilityMode.value = "my-services";
    safeBrowsingEnabled.value = true;
    clearMaturityFilters();
  }

  const availableProviders = computed(() => {
    if (!allMovies?.value.length) return PROVIDERS
    return PROVIDERS.filter(p =>
      allMovies.value.some(m => m.prov & p.bit)
    );
  });

  return {
    allMovies, loading, error,
    searchQuery, selectedGenres, selectedProviders, availabilityMode, titleType, minRating, safeBrowsingEnabled, maxMaturityCat,
    activeMaturityProfileId, maturityProfiles,
    filteredMovies, movieRows, availableProviders,
    loadMovies, toggleGenre, toggleProvider, setMaxMaturityCat, setMaxMaturityCats, setMaturityProfiles, updateMaturityProfile, addMaturityProfile, removeMaturityProfile, selectMaturityProfile, clearMaturityFilters, clearFilters,
  };
});

// ── Mock data for development ─────────────────────────────
const MOCK_TITLES = [
  "The Dark Knight", "Inception", "Interstellar", "The Matrix",
  "Pulp Fiction", "Fight Club", "Goodfellas", "The Godfather",
  "Forrest Gump", "The Silence of the Lambs", "Schindler's List",
  "The Lord of the Rings", "Star Wars", "Jurassic Park", "Titanic",
  "The Avengers", "Back to the Future", "Blade Runner", "2001: A Space Odyssey",
  "Apocalypse Now", "Alien", "The Shining", "Full Metal Jacket",
  "Casablanca", "Citizen Kane", "Vertigo", "Psycho",
  "La La Land", "Parasite", "Whiplash", "Get Out",
  "Mad Max: Fury Road", "John Wick", "The Revenant", "No Country for Old Men",
  "There Will Be Blood", "Moonlight", "12 Years a Slave", "Gravity",
  "Her", "Ex Machina", "Arrival", "Annihilation",
];

const PLACEHOLDER_COLORS = [
  "#1a1a2e", "#16213e", "#0f3460", "#533483",
  "#2b2d42", "#3d405b", "#264653", "#2a9d8f",
];

function generateMockMovies() {
  const mockProvBits = PROVIDERS.map(p => p.bit);
  const movies = [];
  for (let i = 0; i < 500; i++) {
    const titleBase = MOCK_TITLES[i % MOCK_TITLES.length];
    const prov = mockProvBits[i % mockProvBits.length] |
      (i % 3 === 0 ? mockProvBits[(i + 3) % mockProvBits.length] : 0);
    // Mock maturity: 4 categories × 4-bit nibble (value 0–10, i.e. CSM score × 2)
    let mat = 0;
    for (let c = 0; c < 4; c++) {
      // Weight toward lower scores (most movies aren't extreme)
      const nibble = Math.floor(Math.random() * Math.random() * 11) & 0xf;
      mat |= nibble << (c * 4);
    }
    movies.push({
      id: `tt${String(i).padStart(7, "0")}`,
      t: i < MOCK_TITLES.length ? titleBase : `${titleBase} ${Math.floor(i / MOCK_TITLES.length) + 1}`,
      y: 1970 + Math.floor(Math.random() * 55),
      r: Math.round((5 + Math.random() * 5) * 10) / 10,
      g: (1 << Math.floor(Math.random() * 22)) | (1 << Math.floor(Math.random() * 22)),
      pop: Math.round(Math.random() * 200 * 10) / 10,
      p: null,
      prov,
      mat,
      _mockColor: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
    });
  }
  return movies.sort((a, b) => b.r - a.r);
}
