<template>
  <nav class="app-tabs" aria-label="Primary navigation">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="app-tab"
      :class="{ active: activeTab === tab.id }"
      :aria-current="activeTab === tab.id ? 'page' : undefined"
      :aria-label="tab.label"
      :title="tab.label"
      @click="$emit('select', tab.id)"
    >
      <svg class="app-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="tab.path" />
      </svg>
    </button>
  </nav>
</template>

<script setup>
defineProps({ activeTab: { type: String, required: true } });
defineEmits(["select"]);

// Material Design icon paths: home-variant-outline, magnify, cog-outline.
const tabs = [
  { id: "discover", label: "Discover", path: "M12 3L2 12H5V20H10V14H14V20H19V12H22L12 3M12 5.69L17 10.19V18H16V12H8V18H7V10.19L12 5.69Z" },
  { id: "search", label: "Search", path: "M9.5 3A6.5 6.5 0 0 1 16 9.5C16 11.11 15.41 12.59 14.44 13.73L14.71 14H15.5L20.5 19L19 20.5L14 15.5V14.71L13.73 14.44C12.59 15.41 11.11 16 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3M9.5 5C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z" },
  { id: "settings", label: "Settings", path: "M12 8A4 4 0 0 1 16 12A4 4 0 0 1 12 16A4 4 0 0 1 8 12A4 4 0 0 1 12 8M12 10A2 2 0 0 0 10 12A2 2 0 0 0 12 14A2 2 0 0 0 14 12A2 2 0 0 0 12 10M10 22C9.75 22 9.54 21.82 9.5 21.58L9.13 18.93C8.5 18.68 7.96 18.34 7.44 17.94L4.95 18.95C4.73 19.03 4.46 18.95 4.34 18.73L2.34 15.27C2.21 15.05 2.27 14.78 2.46 14.63L4.57 12.97L4.5 12L4.57 11.03L2.46 9.37C2.27 9.22 2.21 8.95 2.34 8.73L4.34 5.27C4.46 5.05 4.73 4.96 4.95 5.05L7.44 6.06C7.96 5.66 8.5 5.32 9.13 5.07L9.5 2.42C9.54 2.18 9.75 2 10 2H14C14.25 2 14.46 2.18 14.5 2.42L14.87 5.07C15.5 5.32 16.04 5.66 16.56 6.06L19.05 5.05C19.27 4.96 19.54 5.05 19.66 5.27L21.66 8.73C21.79 8.95 21.73 9.22 21.54 9.37L19.43 11.03L19.5 12L19.43 12.97L21.54 14.63C21.73 14.78 21.79 15.05 21.66 15.27L19.66 18.73C19.54 18.95 19.27 19.04 19.05 18.95L16.56 17.94C16.04 18.34 15.5 18.68 14.87 18.93L14.5 21.58C14.46 21.82 14.25 22 14 22H10M11.25 4L10.88 6.61C9.68 6.86 8.62 7.5 7.85 8.39L5.44 7.35L4.69 8.65L6.8 10.2C6.4 11.37 6.4 12.64 6.8 13.8L4.68 15.36L5.43 16.66L7.86 15.62C8.63 16.5 9.68 17.14 10.87 17.38L11.24 20H12.76L13.13 17.39C14.32 17.14 15.37 16.5 16.14 15.62L18.57 16.66L19.32 15.36L17.2 13.81C17.6 12.64 17.6 11.37 17.2 10.2L19.31 8.65L18.56 7.35L16.15 8.39C15.38 7.5 14.32 6.86 13.12 6.62L12.75 4H11.25Z" },
];
</script>

<style scoped>
.app-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 7px max(12px, env(safe-area-inset-left)) calc(7px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right));
  background: rgba(8, 8, 16, 0.82);
  border-top: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 -18px 50px rgba(0,0,0,0.34);
  backdrop-filter: blur(20px) saturate(1.25);
  -webkit-backdrop-filter: blur(20px) saturate(1.25);
}

.app-tab {
  appearance: none;
  min-width: 0;
  min-height: 54px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: rgba(240,238,232,0.52);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}

.app-tab:hover,
.app-tab:focus-visible {
  background: rgba(255,255,255,0.05);
  color: rgba(240,238,232,0.78);
  outline: none;
}

.app-tab.active {
  color: var(--accent);
}

.app-tab:active {
  transform: scale(0.96);
}

.app-tab-icon {
  width: 28px;
  height: 28px;
  display: block;
  fill: currentColor;
}

@media (min-width: 800px) {
  .app-tabs {
    left: 50%;
    right: auto;
    bottom: 18px;
    width: min(360px, calc(100vw - 32px));
    transform: translateX(-50%);
    padding: 8px;
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 24px;
  }
}
</style>
