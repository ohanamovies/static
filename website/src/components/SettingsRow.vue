<template>
  <RouterLink class="settings-row" :to="to">
    <span class="settings-row-icon" aria-hidden="true">
      <svg v-if="iconPath" viewBox="0 0 24 24" focusable="false">
        <path :d="iconPath" />
      </svg>
      <span v-else>{{ icon }}</span>
    </span>
    <span class="settings-row-main">
      <span class="settings-row-label">{{ label }}</span>
      <strong>{{ title }}</strong>
    </span>
    <span class="settings-row-chevron" aria-hidden="true">›</span>
  </RouterLink>
</template>

<script setup>
const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, default: "" },
  label: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: "" },
});

// Material Design icon paths: account-circle-outline, play-circle-outline, shield-account-outline, format-list-bulleted.
const ICON_PATHS = {
  profile: "M12 4A4 4 0 0 1 16 8A4 4 0 0 1 12 12A4 4 0 0 1 8 8A4 4 0 0 1 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14M12 2A6 6 0 0 0 6 8A6 6 0 0 0 12 14A6 6 0 0 0 18 8A6 6 0 0 0 12 2M12 16C8.69 16 6 17.34 6 19H18C18 17.34 15.31 16 12 16Z",
  streaming: "M10 16.5V7.5L16 12M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20Z",
  maturity: "M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 3.18L19 6.3V11.22C19 15.77 16.09 19.95 12 20.92C7.91 19.95 5 15.77 5 11.22V6.3L12 3.18M11 7H13V13H11V7M11 15H13V17H11V15Z",
  lists: "M7 5H21V7H7V5M7 11H21V13H7V11M7 17H21V19H7V17M3 5H5V7H3V5M3 11H5V13H3V11M3 17H5V19H3V17Z",
};

const iconPath = ICON_PATHS[props.icon] || "";
</script>

<style scoped>
.settings-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.settings-row:hover .settings-row-chevron,
.settings-row:focus-visible .settings-row-chevron {
  color: var(--teal);
  transform: translateX(2px);
}

.settings-row:focus-visible {
  outline: 2px solid rgba(45,212,191,0.62);
  outline-offset: 4px;
  border-radius: 10px;
}

.settings-row-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(255,255,255,0.055);
  color: rgba(240,238,232,0.78);
  font-size: 18px;
}

.settings-row-icon svg {
  width: 22px;
  height: 22px;
  display: block;
  fill: currentColor;
}

.settings-row-main {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.settings-row-label {
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--teal);
  font-weight: 800;
}

.settings-row strong {
  min-width: 0;
  color: var(--white);
  font-size: 16px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.settings-row-chevron {
  color: rgba(240,238,232,0.42);
  font-size: 28px;
  line-height: 1;
  transition: transform 0.15s, color 0.15s;
}
</style>
