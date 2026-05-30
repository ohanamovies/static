<template>
  <div class="app">
    <!-- Loading state -->
    <div class="loading-screen" v-if="store.loading">
      <div class="loading-logo">Ohana movies</div>
      <div class="loading-bar"><div class="loading-bar-fill"></div></div>
      <p class="loading-text">Loading movies…</p>
    </div>

    <template v-else>
      <HeroSection />

      <main class="catalog">
        <div v-if="store.filteredMovies.length === 0" class="empty-state">
          <p class="empty-icon">◌</p>
          <p class="empty-title">No movies match your filters</p>
          <button class="clear-btn" @click="store.clearFilters">Clear all filters</button>
        </div>

        <template v-else>
          <!-- Search results: flat grid, rows hidden -->
          <div v-if="store.searchQuery" class="search-results-grid">
            <div class="search-results-header">
              <h2>Results for "<em>{{ store.searchQuery }}</em>"</h2>
              <span>{{ store.filteredMovies.length }} titles</span>
            </div>
            <div class="grid">
              <MovieCard
                v-for="movie in store.filteredMovies.slice(0, 120)"
                :key="movie.id"
                :movie="movie"
                @select="selectedMovie = $event"
              />
            </div>
          </div>

          <!-- Normal rows (hidden while searching) -->
          <template v-else>
            <MovieRow
              v-for="row in store.movieRows"
              :key="row.id"
              :row="row"
              @selectMovie="selectedMovie = $event"
            />
          </template>
        </template>
      </main>

      <footer class="footer">
        <p>Data from <a href="https://www.imdb.com" target="_blank" rel="noopener">IMDb</a> &amp; <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. Not affiliated with either.</p>
      </footer>
    </template>

    <MovieModal
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useMovieStore } from "@/stores/movies.js";
import HeroSection from "@/components/HeroSection.vue";
import MovieRow from "@/components/MovieRow.vue";
import MovieCard from "@/components/MovieCard.vue";
import MovieModal from "@/components/MovieModal.vue";

const store = useMovieStore();
const selectedMovie = ref(null);

onMounted(() => store.loadMovies());
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Loading ── */
.loading-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.loading-logo {
  font-family: var(--font-display);
  font-size: clamp(36px, 8vw, 64px);
  letter-spacing: 0.12em;
  color: var(--white);
}

.loading-bar {
  width: 200px;
  height: 3px;
  background: var(--surface3);
  border-radius: 99px;
  overflow: hidden;
}

.loading-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
  animation: loadProgress 1.5s ease-in-out infinite;
}

@keyframes loadProgress {
  0% { width: 0%; margin-left: 0; }
  50% { width: 60%; }
  100% { width: 0%; margin-left: 100%; }
}

.loading-text {
  font-size: 13px;
  color: var(--muted);
}

/* ── Catalog ── */
.catalog {
  flex: 1;
  padding-bottom: 60px;
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon { font-size: 48px; color: var(--muted); }
.empty-title { font-size: 18px; color: var(--muted); }

.clear-btn {
  margin-top: 8px;
  padding: 8px 20px;
  background: var(--accent);
  border: none;
  border-radius: 99px;
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.clear-btn:hover { opacity: 0.85; }

/* ── Search results grid ── */
.search-results-grid {
  padding: 0 48px;
}

.search-results-header {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-results-header h2 {
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.04em;
}

.search-results-header h2 em {
  font-style: italic;
  color: var(--accent);
}

.search-results-header span {
  font-size: 13px;
  color: var(--muted);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
}

/* ── Footer ── */
.footer {
  padding: 24px 48px;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.footer a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s;
}
.footer a:hover { color: var(--white); }

/* ── Mobile ── */
@media (max-width: 640px) {
  .search-results-grid { padding: 0 16px; }
  .footer { padding: 24px 16px; }
}
</style>
