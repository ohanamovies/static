<template>
  <section class="row" v-if="row.movies.length" ref="rowEl">
    <div class="row-header">
      <h2 class="row-label">{{ row.label }}</h2>
    </div>
    <div class="row-track-wrapper">
      <button
        class="row-arrow row-arrow--left"
        :class="{ hidden: scrollLeft <= 0 }"
        @click="scroll(-1)"
        aria-label="Scroll left"
      >‹</button>

      <div class="row-track" ref="trackEl" @scroll="onScroll">
        <!-- Left spacer: represents the unrendered cards before the window -->
        <div v-if="startIdx > 0" :style="{ width: leftPad + 'px', flexShrink: 0 }"></div>

        <template v-if="isVisible">
          <MovieCard
            v-for="movie in visibleMovies"
            :key="movie.id"
            :movie="movie"
            @select="$emit('selectMovie', $event)"
          />
        </template>

        <!-- Right spacer: represents the unrendered cards after the window -->
        <div v-if="endIdx < row.movies.length" :style="{ width: rightPad + 'px', flexShrink: 0 }"></div>
      </div>

      <button
        class="row-arrow row-arrow--right"
        :class="{ hidden: atEnd }"
        @click="scroll(1)"
        aria-label="Scroll right"
      >›</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import MovieCard from "./MovieCard.vue";

const props = defineProps({ row: { type: Object, required: true } });
defineEmits(["selectMovie"]);

const trackEl = ref(null);
const rowEl = ref(null);
const scrollLeft = ref(0);
const atEnd = ref(false);
const isVisible = ref(false);
const containerWidth = ref(800);

// Card dimensions — read from CSS vars on mount, fall back to design-system defaults
let cardStride = 172; // 160px card + 12px gap

const BUFFER = 4; // extra cards to render on each side of the visible window

const startIdx = computed(() =>
  Math.max(0, Math.floor(scrollLeft.value / cardStride) - BUFFER)
);

const endIdx = computed(() =>
  Math.min(
    props.row.movies.length,
    Math.ceil((scrollLeft.value + containerWidth.value) / cardStride) + BUFFER
  )
);

const visibleMovies = computed(() =>
  props.row.movies.slice(startIdx.value, endIdx.value)
);

// Width occupied by cards we're NOT rendering on the left
const leftPad = computed(() => startIdx.value * cardStride);

// Width occupied by cards we're NOT rendering on the right
// Subtract one gap because the last card in any group has no gap after it
const rightPad = computed(() => {
  const trailing = props.row.movies.length - endIdx.value;
  return trailing > 0 ? trailing * cardStride - 12 : 0;
});

function onScroll() {
  const el = trackEl.value;
  if (!el) return;
  scrollLeft.value = el.scrollLeft;
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
}

function scroll(dir) {
  const el = trackEl.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
}

let rowObserver = null;
let resizeObserver = null;

onMounted(() => {
  // Read actual CSS variable values
  const style = getComputedStyle(document.documentElement);
  const cardW = parseInt(style.getPropertyValue("--card-w")) || 160;
  const gap = parseInt(style.getPropertyValue("--gap")) || 12;
  cardStride = cardW + gap;

  // Track container width so the window calculation stays accurate
  if (trackEl.value) {
    containerWidth.value = trackEl.value.clientWidth;
    resizeObserver = new ResizeObserver(([entry]) => {
      containerWidth.value = entry.contentRect.width;
    });
    resizeObserver.observe(trackEl.value);
  }

  // Defer rendering cards until the row scrolls into view
  rowObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true;
        rowObserver?.disconnect();
        rowObserver = null;
      }
    },
    { rootMargin: "200px" }
  );
  if (rowEl.value) rowObserver.observe(rowEl.value);

  onScroll();
});

onUnmounted(() => {
  rowObserver?.disconnect();
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.row {
  margin-bottom: 36px;
}

.row-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0 48px;
  margin-bottom: 12px;
}

.row-label {
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.06em;
  color: var(--white);
}

.row-track-wrapper {
  position: relative;
}

.row-track {
  display: flex;
  gap: var(--gap);
  overflow-x: auto;
  padding: 8px 48px 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x proximity;
  min-height: calc(var(--card-h) + 48px);
}

.row-track::-webkit-scrollbar { display: none; }

.row-track > * { scroll-snap-align: start; }

.row-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 40px;
  height: 72px;
  background: rgba(8,8,16,0.85);
  border: 1px solid var(--border);
  color: var(--white);
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, opacity 0.15s;
  backdrop-filter: blur(4px);
}

.row-arrow--left  { left: 0;  border-radius: 0 var(--radius) var(--radius) 0; }
.row-arrow--right { right: 0; border-radius: var(--radius) 0 0 var(--radius); }

.row-arrow:hover { background: rgba(232,54,93,0.4); }
.row-arrow.hidden { opacity: 0; pointer-events: none; }

@media (max-width: 640px) {
  .row-header { padding: 0 16px; }
  .row-track  { padding: 8px 16px 16px; }
}
</style>
