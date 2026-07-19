<template>
  <div class="search-box">
    <svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <input
      ref="inputEl"
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      spellcheck="false"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown.enter="emit('commit')"
    />
    <button v-if="modelValue" type="button" aria-label="Clear search" @click="emit('clear')">×</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const inputEl = ref(null);

const emit = defineEmits(["update:modelValue", "commit", "clear"]);

defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Search…" },
  ariaLabel: { type: String, default: "Search" },
});

function focus(options) {
  inputEl.value?.focus(options);
}

defineExpose({ focus });
</script>

<style scoped>
.search-box { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 18px; width: 20px; height: 20px; color: var(--muted); pointer-events: none; }
.search-box input { width: 100%; min-width: 0; padding: 17px 56px 17px 52px; border: 1px solid rgba(255,255,255,0.14); border-radius: 15px; background: rgba(8,8,16,0.94); color: var(--white); font: inherit; font-size: 17px; outline: none; }
.search-box input:focus { border-color: rgba(45,212,191,0.72); box-shadow: 0 0 0 2px rgba(45,212,191,0.14); }
.search-box button { position: absolute; right: 12px; width: 32px; height: 32px; border: 1px solid rgba(255,255,255,0.14); border-radius: 50%; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.74); font-size: 22px; cursor: pointer; }
</style>
