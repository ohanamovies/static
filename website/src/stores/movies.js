import { defineStore } from "pinia";
import { ref, computed, shallowRef } from "vue";
import Fuse from "fuse.js";

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

// ── Maturity categories (5 IMDb parentsGuide sections, 2 bits each) ──────────
// Severity: 0=None, 1=Mild, 2=Moderate, 3=Severe
export const MATURITY_CATEGORIES = [
  { key: "sexAndNudity",           label: "Nudity",        icon: "👁", shift: 0 },
  { key: "violenceAndGore",        label: "Violence",      icon: "⚔", shift: 2 },
  { key: "profanity",              label: "Language",      icon: "💬", shift: 4 },
  { key: "alcoholDrugsAndSmoking", label: "Substances",    icon: "🍷", shift: 6 },
  { key: "frighteningScenes",      label: "Frightening",   icon: "😨", shift: 8 },
];

export const SEVERITY_LABELS = ["None", "Mild", "Moderate", "Severe"];

export function getSeverity(mat, shift) {
  return (mat >>> shift) & 3;
}

export function getMaxSeverity(mat) {
  if (!mat) return 0;
  let max = 0;
  for (const { shift } of MATURITY_CATEGORIES) {
    max = Math.max(max, getSeverity(mat, shift));
  }
  return max;
}

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
  const selectedProviders = ref(0);       // bitmask of selected providers
  const minRating = ref(0);
  // Per-category max severity: index matches MATURITY_CATEGORIES order, -1 = no filter
  const maxMaturityCat = ref([-1, -1, -1, -1, -1]);

  let fuse = null;

  // ── Load data ─────────────────────────────────────────────
  async function loadMovies() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/movies.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allMovies.value = data.movies || generateMockMovies();
    } catch (e) {
      console.warn("Could not load movies.json, using mock data:", e.message);
      allMovies.value = generateMockMovies();
    } finally {
      loading.value = false;
      fuse = new Fuse(allMovies.value, {
        keys: ["t"],
        threshold: 0.38,
        includeScore: true,
        minMatchCharLength: 2,
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

    if (selectedGenres.value.size > 0) {
      let mask = 0;
      for (const g of selectedGenres.value) mask |= (GENRES[g] ?? 0);
      pool = pool.filter(({ item }) => item.g & mask);
    }

    if (selectedProviders.value !== 0) {
      const pMask = selectedProviders.value;
      pool = pool.filter(({ item }) => item.prov & pMask);
    }

    if (minRating.value > 0) {
      pool = pool.filter(({ item }) => item.r >= minRating.value);
    }

    const catThresholds = maxMaturityCat.value;
    if (catThresholds.some(t => t >= 0)) {
      pool = pool.filter(({ item }) => {
        // Exclude movies with no maturity data when any filter is active
        if (item.mat === undefined) return false;
        for (let i = 0; i < MATURITY_CATEGORIES.length; i++) {
          const threshold = catThresholds[i];
          if (threshold < 0) continue;
          if (getSeverity(item.mat, MATURITY_CATEGORIES[i].shift) > threshold) return false;
        }
        return true;
      });
    }

    if (query.length >= 2) {
      pool.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return (b.item.pop || 0) * b.item.r - (a.item.pop || 0) * a.item.r;
      });
    } else {
      pool.sort((a, b) =>
        (b.item.pop || 0) * b.item.r - (a.item.pop || 0) * a.item.r
      );
    }

    return pool.map(({ item }) => item);
  });

  // ── Rows for the Netflix-like grid ────────────────────────
  const movieRows = computed(() => {
    const pool = filteredMovies.value;
    if (pool.length === 0) return [];

    const rows = [];
    const byPopRating = (a, b) => (b.pop || 0) * b.r - (a.pop || 0) * a.r;

    const ROW_MAX = 200;

    const topRated = [...pool].sort((a, b) => b.r - a.r).slice(0, ROW_MAX);
    if (topRated.length >= 4)
      rows.push({ id: "top-rated", label: "Top Rated", movies: topRated });

    const trending = [...pool].sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, ROW_MAX);
    if (trending.length >= 4)
      rows.push({ id: "trending", label: "Trending Now", movies: trending });

    for (const [genre, mask] of Object.entries(GENRES)) {
      const genreMovies = pool
        .filter((m) => m.g & mask)
        .sort(byPopRating)
        .slice(0, ROW_MAX);
      if (genreMovies.length >= 4)
        rows.push({ id: `genre-${genre}`, label: genre, movies: genreMovies });
    }

    for (const prov of PROVIDERS) {
      const provMovies = pool
        .filter((m) => m.prov & prov.bit)
        .sort(byPopRating)
        .slice(0, ROW_MAX);
      if (provMovies.length >= 4)
        rows.push({ id: `prov-${prov.id}`, label: `On ${prov.name}`, movies: provMovies });
    }

    return rows;
  });

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
    const arr = [...maxMaturityCat.value];
    arr[catIndex] = arr[catIndex] === level ? -1 : level; // toggle off if same
    maxMaturityCat.value = arr;
  }

  function clearFilters() {
    searchQuery.value = "";
    selectedGenres.value = new Set();
    selectedProviders.value = 0;
    minRating.value = 0;
    maxMaturityCat.value = [-1, -1, -1, -1, -1];
  }

  const availableProviders = computed(() => {
    return PROVIDERS.filter(p =>
      allMovies.value.some(m => m.prov & p.bit)
    );
  });

  return {
    allMovies, loading, error,
    searchQuery, selectedGenres, selectedProviders, minRating, maxMaturityCat,
    filteredMovies, movieRows, availableProviders,
    loadMovies, toggleGenre, toggleProvider, setMaxMaturityCat, clearFilters,
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
    // Mock maturity: random severity for each category
    let mat = 0;
    for (let c = 0; c < 5; c++) {
      mat |= (Math.floor(Math.random() * 4) & 3) << (c * 2);
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
