import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { kvRead, kvWrite, generateToken, safeAdd, safeRemove, safeToggle, safeReplace } from "@/lib/kvStore.js";

const LS_KEY = "ohanatv_user_token";

export const useUserStore = defineStore("user", () => {
  const userToken = ref(localStorage.getItem(LS_KEY) || null);
  const userData = ref(null); // { name, listTokens, watched, customProviders, filterPrefs }
  const lists = ref([]);      // [{ token, name, movies }]
  const loading = ref(false);
  const saving = ref(false);

  const isLoggedIn = computed(() => !!userToken.value && !!userData.value);
  const watchedSet = computed(() => new Set(userData.value?.watched ?? []));

  function isWatched(id) { return watchedSet.value.has(id); }
  function isInList(listToken, id) {
    return lists.value.find(l => l.token === listToken)?.movies.includes(id) ?? false;
  }

  // ── Core persistence ───────────────────────────────────────────────────────

  async function init() {
    if (!userToken.value) return;
    loading.value = true;
    try {
      const data = await kvRead(userToken.value);
      if (!data) return;
      userData.value = data;
      await _loadAllLists();
    } catch (e) {
      console.warn("user init failed:", e);
    } finally {
      loading.value = false;
    }
  }

  async function _loadAllLists() {
    const tokens = userData.value?.listTokens ?? [];
    if (!tokens.length) { lists.value = []; return; }
    const results = await Promise.allSettled(
      tokens.map(t => kvRead(t).then(d => d ? { token: t, ...d } : null))
    );
    lists.value = results
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value);
  }

  // ── User lifecycle ─────────────────────────────────────────────────────────

  async function createUser(name) {
    const token = generateToken();
    const data = { name, listTokens: [], watched: [], customProviders: [], filterPrefs: null };
    await kvWrite(token, data);
    userToken.value = token;
    userData.value = data;
    lists.value = [];
    localStorage.setItem(LS_KEY, token);
  }

  async function importUser(token) {
    const data = await kvRead(token);
    if (!data) throw new Error("No user found for this token");
    userToken.value = token;
    userData.value = data;
    lists.value = [];
    localStorage.setItem(LS_KEY, token);
    await _loadAllLists();
  }

  async function setName(name) {
    if (!userToken.value || !userData.value) return;
    const previous = userData.value;
    userData.value = { ...userData.value, name }; // optimistic
    saving.value = true;
    try {
      userData.value = await safeReplace(userToken.value, "name", name);
    } catch (e) {
      userData.value = previous;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  // ── Lists ──────────────────────────────────────────────────────────────────

  async function createList(name) {
    if (!userData.value || !userToken.value) return;
    const token = generateToken();
    const listData = { name, movies: [] };
    await kvWrite(token, listData);
    lists.value = [...lists.value, { token, ...listData }];
    saving.value = true;
    try {
      userData.value = await safeAdd(userToken.value, "listTokens", token);
    } finally {
      saving.value = false;
    }
    return token;
  }

  async function addListByToken(token) {
    if (!userData.value || !userToken.value) throw new Error("Not logged in");
    if (userData.value.listTokens?.includes(token)) return;
    const data = await kvRead(token);
    if (!data) throw new Error("List not found");
    lists.value = [...lists.value, { token, ...data }];
    saving.value = true;
    try {
      userData.value = await safeAdd(userToken.value, "listTokens", token);
    } finally {
      saving.value = false;
    }
  }

  async function removeList(token) {
    if (!userData.value || !userToken.value) return;
    const previousLists = lists.value;
    lists.value = lists.value.filter(l => l.token !== token); // optimistic
    saving.value = true;
    try {
      userData.value = await safeRemove(userToken.value, "listTokens", token);
    } catch (e) {
      lists.value = previousLists;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function renameList(token, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const list = lists.value.find(l => l.token === token);
    if (!list || list.name === trimmed) return;
    lists.value = lists.value.map(l => l.token === token ? { ...l, name: trimmed } : l);
    await _saveList(token);
  }

  async function toggleMovieInList(listToken, imdbId) {
    const list = lists.value.find(l => l.token === listToken);
    if (!list) return;
    const previousLists = lists.value;
    const movies = list.movies.includes(imdbId)
      ? list.movies.filter(id => id !== imdbId)
      : [...list.movies, imdbId];
    lists.value = lists.value.map(l => l.token === listToken ? { ...l, movies } : l); // optimistic
    try {
      const updated = await safeToggle(listToken, "movies", imdbId);
      lists.value = lists.value.map(l => l.token === listToken ? { ...l, ...updated } : l);
    } catch (e) {
      lists.value = previousLists;
      throw e;
    }
  }

  // ── Watched ────────────────────────────────────────────────────────────────

  async function toggleWatched(imdbId) {
    if (!userData.value || !userToken.value) return;
    const previous = userData.value;
    const watched = userData.value.watched ?? [];
    const newWatched = watched.includes(imdbId)
      ? watched.filter(id => id !== imdbId)
      : [...watched, imdbId];
    userData.value = { ...userData.value, watched: newWatched }; // optimistic
    try {
      userData.value = await safeToggle(userToken.value, "watched", imdbId);
    } catch (e) {
      userData.value = previous;
      throw e;
    }
  }

  // ── Custom providers ───────────────────────────────────────────────────────

  async function addCustomProvider(urlTemplate) {
    if (!userData.value || !userToken.value) return;
    if ((userData.value.customProviders ?? []).includes(urlTemplate)) return;
    const previous = userData.value;
    userData.value = { ...userData.value, customProviders: [...(userData.value.customProviders ?? []), urlTemplate] };
    try {
      userData.value = await safeAdd(userToken.value, "customProviders", urlTemplate);
    } catch (e) {
      userData.value = previous;
      throw e;
    }
  }

  async function removeCustomProvider(urlTemplate) {
    if (!userData.value || !userToken.value) return;
    const previous = userData.value;
    userData.value = {
      ...userData.value,
      customProviders: (userData.value.customProviders ?? []).filter(u => u !== urlTemplate),
    };
    try {
      userData.value = await safeRemove(userToken.value, "customProviders", urlTemplate);
    } catch (e) {
      userData.value = previous;
      throw e;
    }
  }

  // ── Filter preferences ─────────────────────────────────────────────────────

  async function saveFilterPrefs(prefs) {
    if (!userData.value || !userToken.value) return;
    const previous = userData.value;
    userData.value = { ...userData.value, filterPrefs: prefs }; // optimistic
    try {
      userData.value = await safeReplace(userToken.value, "filterPrefs", prefs);
    } catch (e) {
      userData.value = previous;
      throw e;
    }
  }

  // ── Sharing / auth ─────────────────────────────────────────────────────────

  function getShareUrl(listToken) {
    return `${window.location.origin}${window.location.pathname}?add=${listToken}`;
  }

  function logout() {
    userToken.value = null;
    userData.value = null;
    lists.value = [];
    localStorage.removeItem(LS_KEY);
  }

  return {
    userToken, userData, lists, loading, saving, isLoggedIn, watchedSet,
    isWatched, isInList, init, createUser, importUser, setName,
    createList, addListByToken, removeList, renameList, toggleMovieInList, toggleWatched,
    addCustomProvider, removeCustomProvider, saveFilterPrefs,
    getShareUrl, logout,
  };
});
