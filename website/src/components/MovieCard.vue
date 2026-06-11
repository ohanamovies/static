<template>
  <div class="card" @click="$emit('select', movie)" :title="movie.t">
    <div class="card-poster" :style="posterStyle">
      <img
        v-if="movie.p && !imgError"
        :src="movie.p"
        :alt="movie.t"
        loading="lazy"
        :class="{ 'poster-blurred': nudityBlurred }"
        @error="imgError = true"
      />
      <div v-else class="card-placeholder">
        <span class="card-placeholder-title">{{ movie.t }}</span>
      </div>

      <div class="card-overlay">
        <div class="card-rating">★ {{ movie.r?.toFixed(1) }}</div>
        <div class="card-year">{{ movie.y }}</div>
      </div>

      <!-- Maturity severity dots -->
      <div class="card-maturity" v-if="movie.mat">
        <span
          v-for="cat in MATURITY_CATEGORIES"
          :key="cat.key"
          class="mat-dot"
          :class="scoreCssClass(Math.round(getScore(movie.mat, cat.shift)))"
          :title="`${cat.label}: ${SEVERITY_LABELS[Math.round(getScore(movie.mat, cat.shift))]}`"
        ></span>
      </div>
    </div>
    <div class="card-info">
      <p class="card-title">{{ movie.t }}</p>
      <p class="card-genres">{{ genreLabels }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { GENRES } from "@/stores/movies.js";
import { MATURITY_CATEGORIES, SEVERITY_LABELS, getScore, scoreCssClass } from "@/maturity.js";

const props = defineProps({ movie: { type: Object, required: true } });
defineEmits(["select"]);

const imgError = ref(false);

const genreLabels = computed(() => {
  const labels = [];
  for (const [name, mask] of Object.entries(GENRES)) {
    if (props.movie.g & mask) labels.push(name);
  }
  return labels.slice(0, 2).join(" · ") || "–";
});

// Sex & Nudity is shift 0; blur if score >= 4 (Strong or Severe)
const nudityBlurred = computed(() =>
  props.movie.mat !== undefined && getScore(props.movie.mat, 0) > 4
);

const posterStyle = computed(() => ({
  background: props.movie._mockColor || "#16161f",
}));
</script>

<style scoped>
.card {
  width: var(--card-w);
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
  z-index: 0;
}

.card:hover {
  transform: scale(1.08);
  z-index: 10;
}

.card-poster {
  width: var(--card-w);
  height: var(--card-h);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}

.card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-blurred {
  filter: blur(12px);
  transform: scale(1.08);
}

.card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 10px;
}

.card-placeholder-title {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.7);
  line-height: 1.2;
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 8px 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.card:hover .card-overlay { opacity: 1; }

.card-rating {
  font-size: 12px;
  font-weight: 500;
  color: var(--gold);
}

.card-year {
  font-size: 11px;
  color: var(--muted);
}

/* ── Maturity dots ── */
.card-maturity {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  gap: 3px;
  opacity: 1;
}

.mat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: block;
  flex-shrink: 0;
}

.mat-dot.sev-0 { background: #4ade80; }
.mat-dot.sev-1 { background: #a3e635; }
.mat-dot.sev-2 { background: #facc15; }
.mat-dot.sev-3 { background: #fb923c; }
.mat-dot.sev-4 { background: #f87171; }
.mat-dot.sev-5 { background: #dc2626; }

/* ── Info ── */
.card-info {
  padding: 6px 2px 0;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--white);
}

.card-genres {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
</style>