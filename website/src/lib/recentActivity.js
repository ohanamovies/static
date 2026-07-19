const RECENT_SEARCHES_KEY = "ohanatv_recent_searches";
const RECENT_VIEWED_KEY = "ohanatv_recent_viewed";
const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_VIEWED = 12;

function readArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray(key, values) {
  localStorage.setItem(key, JSON.stringify(values));
  window.dispatchEvent(new CustomEvent("ohana:recent-activity", { detail: { key } }));
}

export function getRecentSearches() {
  return readArray(RECENT_SEARCHES_KEY).filter(Boolean);
}

export function addRecentSearch(query) {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) return;
  const existing = getRecentSearches().filter(item => item.toLowerCase() !== normalized.toLowerCase());
  writeArray(RECENT_SEARCHES_KEY, [normalized, ...existing].slice(0, MAX_RECENT_SEARCHES));
}

export function clearRecentSearches() {
  writeArray(RECENT_SEARCHES_KEY, []);
}

export function getRecentViewedIds() {
  return readArray(RECENT_VIEWED_KEY).filter(Boolean);
}

export function addRecentViewed(movieId) {
  if (!movieId) return;
  const existing = getRecentViewedIds().filter(id => id !== movieId);
  writeArray(RECENT_VIEWED_KEY, [movieId, ...existing].slice(0, MAX_RECENT_VIEWED));
}
