<template>
  <component
    :is="tag"
    :to="to || undefined"
    :href="href || undefined"
    :type="isButton ? 'button' : undefined"
    class="ui-chip"
    :class="[
      `ui-chip--${tone}`,
      `ui-chip--${size}`,
      { 'is-active': active, 'ui-chip--block': block },
    ]"
    :aria-pressed="isButton ? pressed : undefined"
    :disabled="isButton ? disabled : undefined"
    :aria-disabled="!isButton && disabled ? 'true' : undefined"
    :tabindex="!isButton && disabled ? -1 : undefined"
  >
    <span class="ui-chip__label"><slot>{{ label }}</slot></span>
  </component>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps({
  label: { type: String, default: "" },
  active: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: "" },
  tone: {
    type: String,
    default: "neutral",
    validator: value => ["neutral", "accent", "safe", "danger"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: value => ["sm", "md", "lg"].includes(value),
  },
  block: { type: Boolean, default: false },
});

const tag = computed(() => props.to ? RouterLink : props.href ? "a" : "button");
const isButton = computed(() => tag.value === "button");
const pressed = computed(() => props.active ? "true" : "false");
</script>

<style scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: rgba(240,238,232,0.72);
  font: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s, background 0.15s, opacity 0.15s;
}

.ui-chip--sm { min-height: 32px; padding: 0 10px; font-size: 12px; }
.ui-chip--md { min-height: 38px; padding: 0 14px; }
.ui-chip--lg { min-height: 44px; padding: 0 16px; }
.ui-chip--block { width: 100%; }

.ui-chip__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (hover: hover) {
  .ui-chip:hover {
    border-color: rgba(45,212,191,0.42);
    color: var(--white);
  }
}

.ui-chip:focus-visible {
  border-color: rgba(45,212,191,0.42);
  color: var(--white);
  outline: none;
}

.ui-chip.is-active {
  border-color: rgba(45,212,191,0.42);
  background: rgba(45,212,191,0.12);
  color: var(--teal);
}

.ui-chip--accent.is-active {
  border-color: rgba(255,255,255,0.42);
  background: rgba(255,255,255,0.14);
  color: var(--white);
}

.ui-chip--safe.is-active {
  border-color: rgba(45,212,191,0.42);
  background: rgba(45,212,191,0.12);
  color: var(--teal);
}

@media (hover: hover) {
  .ui-chip--danger:hover {
    border-color: rgba(248,113,113,0.45);
    background: rgba(248,113,113,0.12);
    color: #fca5a5;
  }
}

.ui-chip--danger:focus-visible,
.ui-chip--danger.is-active {
  border-color: rgba(248,113,113,0.45);
  background: rgba(248,113,113,0.12);
  color: #fca5a5;
}

.ui-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
