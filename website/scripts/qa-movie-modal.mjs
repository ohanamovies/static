#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modal = readFileSync(resolve(root, 'src/components/MovieModal.vue'), 'utf8');
const guards = readFileSync(resolve(root, 'src/composables/modalGuards.js'), 'utf8');

const checks = [
  {
    name: 'dialog is modal, labelled, focusable, and traps Escape/Tab',
    pass: /role="dialog"/.test(modal)
      && /aria-modal="true"/.test(modal)
      && /:aria-labelledby="titleId"/.test(modal)
      && /tabindex="-1"/.test(modal)
      && /@keydown="handleDialogKeydown"/.test(modal)
      && /event\.key === "Escape"/.test(modal)
      && /trapTabKey\(event, dialogRef\.value\)/.test(modal)
      && /export function trapTabKey/.test(guards),
  },
  {
    name: 'close controls are reachable on desktop/mobile and have accessible names',
    pass: (modal.match(/aria-label="Close movie details"/g) || []).length >= 2
      && /modal-close--desktop/.test(modal)
      && /modal-close--mobile/.test(modal)
      && /@click\.self="emit\('close'\)"/.test(modal),
  },
  {
    name: 'open/close lifecycle locks body scroll, restores focus, and resets detail profile per movie',
    pass: /lockBodyScroll\(\)/.test(modal)
      && /unlockBodyScroll\(\)/.test(modal)
      && /previouslyFocused\.value = document\.activeElement/.test(modal)
      && /nextTick\(restoreFocus\)/.test(modal)
      && /selectedDetailProfileId\.value = movieStore\.activeMaturityProfileId/.test(modal),
  },
  {
    name: 'suitability profile chips are real controls and drive local reasoning only',
    pass: /class="profile-glance-pill"/.test(modal)
      && /:aria-pressed="profile\.id === selectedDetailProfileId/.test(modal)
      && /@click="selectedDetailProfileId = profile\.id"/.test(modal)
      && /selectedMaturityValues = computed\(\(\) => selectedDetailProfile\.value\?\.values/.test(modal)
      && !/@click="movieStore\.activeMaturityProfileId = profile\.id"/.test(modal),
  },
  {
    name: 'maturity rows cover score, allowed level, status, tags, unknown state, and external guides',
    pass: /compatibilityRows = computed/.test(modal)
      && /formatScore\(rawScore\)/.test(modal)
      && /Allowed \$\{allowed\} \(\$\{/.test(modal)
      && /statusLabel: unknown \? "Unknown"/.test(modal)
      && /supportTags/.test(modal)
      && /compatibility-summary--empty/.test(modal)
      && /IMDb guide/.test(modal)
      && />CSM</.test(modal),
  },
  {
    name: 'availability section keeps provider chips and settings path without redundant summary copy',
    pass: /modal-providers/.test(modal)
      && /Where to watch/.test(modal)
      && /RouterLink v-if="availabilityDetail\.action" to="\/settings\/streaming"/.test(modal)
      && /class="provider-chip"/.test(modal)
      && !/availabilityDetail\.label/.test(modal),
  },
  {
    name: 'mobile modal uses full-screen fixed surface with internal scroll',
    pass: /\.modal-backdrop\s*\{[\s\S]*position: fixed[\s\S]*height: 100dvh[\s\S]*overflow: hidden/.test(modal)
      && /\.modal\s*\{[\s\S]*width: 100%[\s\S]*height: 100dvh[\s\S]*overflow-y: auto[\s\S]*-webkit-overflow-scrolling: touch/.test(modal)
      && /@media \(max-width: 560px\)[\s\S]*\.modal\s*\{[\s\S]*flex-direction: column/.test(modal)
      && /\.modal-close--mobile\s*\{[\s\S]*position: fixed/.test(modal),
  },
];

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`✓ ${check.name}`);
  } else {
    failed += 1;
    console.error(`✗ ${check.name}`);
  }
}

if (failed) {
  console.error(`\n${failed} movie modal QA check(s) failed.`);
  process.exit(1);
}

console.log('\nMovie modal QA coverage checks passed.');
