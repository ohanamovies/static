#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const hero = read('src/components/HeroSection.vue');
const filterMenu = read('src/components/FilterMenu.vue');
const movieCard = read('src/components/MovieCard.vue');
const searchCard = read('src/components/SearchResultCard.vue');
const settings = read('src/components/SettingsView.vue');
const listView = read('src/views/ListView.vue');
const dropdownChipCss = filterMenu.match(/\.control-chip--dropdown\.is-active,[\s\S]*?\n\}/)?.[0] || '';

const checks = [
  {
    name: 'Discover availability UI uses current truthful labels and keeps unsupported modes disabled',
    pass: /Flatrate/.test(hero)
      && /Free with ads/.test(hero)
      && /Rent/.test(hero)
      && /Buy/.test(hero)
      && /Any/.test(hero)
      && (hero.match(/role="menuitemradio" aria-checked="false" disabled/g) || []).length >= 3
      && /Free\/rent\/buy modes are not tracked yet\./.test(hero)
      && !/Included with my services|On \$\{selectedProviderCount\.value\} services|Any availability/.test(hero),
  },
  {
    name: 'Discover availability dropdown exposes Settings streaming path and clear control is icon-only with accessible name',
    pass: /@click="openStreamingSettings"/.test(hero)
      && /emit\("open-settings", "streaming"\)/.test(hero)
      && /aria-label="Clear Discover filters"/.test(hero)
      && /clear-btn--icon/.test(hero)
      && !/>\s*Clear\s*</.test(hero),
  },
  {
    name: 'Dropdown chips separate open/focus affordance from selected/toggle styling',
    pass: /:highlight-active="false"/.test(hero)
      && /highlightActive: \{ type: Boolean, default: true \}/.test(filterMenu)
      && /:active="open \|\| \(highlightActive && active\)"/.test(filterMenu)
      && /control-chip--dropdown\.is-active/.test(dropdownChipCss)
      && /var\(--white\)/.test(dropdownChipCss)
      && !/var\(--teal\)/.test(dropdownChipCss),
  },
  {
    name: 'Discover title-type chips rely on selected state, not redundant inline close glyphs',
    pass: /toggleTitleType\('tv'/.test(hero)
      && /toggleTitleType\('movies'/.test(hero)
      && !/TV Shows[\s\S]{0,80}×/.test(hero)
      && !/Movies[\s\S]{0,80}×/.test(hero),
  },
  {
    name: 'Discover poster cards suppress tautological fit badges while Search keeps compatibility annotations',
    pass: /return exceeded \? `Review for \$\{activeProfileName\.value\}` : null;/.test(movieCard)
      && !/Fits \$\{activeProfileName\.value\}/.test(movieCard)
      && /Unknown fit/.test(movieCard)
      && /return exceeded \? `Review for \$\{activeProfileName\.value\}` : `Fits \$\{activeProfileName\.value\}`;/.test(searchCard)
      && /Available on your services/.test(searchCard)
      && /Available elsewhere/.test(searchCard),
  },
  {
    name: 'Settings Lists rows are primary navigation with visible affordance and isolated secondary actions',
    pass: /class="list-row"/.test(settings)
      && /role="link"/.test(settings)
      && /tabindex="0"/.test(settings)
      && /@keydown\.enter\.prevent="openList\(list\)"/.test(settings)
      && /@keydown\.space\.prevent="openList\(list\)"/.test(settings)
      && /list-row__open/.test(settings)
      && /list-row__chevron/.test(settings)
      && /@click\.stop @keydown\.stop/.test(settings)
      && /copyListShareLink\(list\)/.test(settings),
  },
  {
    name: 'List/profile gate copy distinguishes no-profile setup from wrong-profile missing-list state',
    pass: /List not in this profile/.test(listView)
      && /Profile needed/.test(listView)
      && /Create or restore a profile to open saved or shared lists\./.test(listView)
      && /This list is not attached to \$\{profileName\}/.test(listView)
      && /Manage lists/.test(listView)
      && /Go to Profile/.test(listView),
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
  console.error(`\n${failed} Sprint 9 trust QA check(s) failed.`);
  process.exit(1);
}

console.log('\nSprint 9 trust/source QA checks passed.');
