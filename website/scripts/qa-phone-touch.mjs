#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = (process.env.QA_BASE_URL || process.argv[2] || 'http://100.85.92.106:5173').replace(/\/$/, '');
const read = path => readFileSync(resolve(root, path), 'utf8');

const hero = read('src/components/HeroSection.vue');
const filterMenu = read('src/components/FilterMenu.vue');
const modal = read('src/components/MovieModal.vue');
const settings = read('src/components/SettingsView.vue');
const listView = read('src/views/ListView.vue');

async function checkReachable(path, label) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
  const body = await response.text();
  if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText}`);
  if (!body.includes('<div id="app"')) throw new Error(`${label}: missing Vue app shell`);
}

const checks = [
  {
    name: 'Dev server serves the phone-review routes',
    pass: async () => {
      await checkReachable('/discover', 'Discover');
      await checkReachable('/search?q=godfather', 'Search deep link');
      await checkReachable('/settings/lists', 'Settings Lists');
      await checkReachable('/lists/bad-id', 'List recovery');
    },
  },
  {
    name: 'Discover availability/dropdown controls match the phone QA target',
    pass: () => /Flatrate/.test(hero)
      && /Free with ads/.test(hero)
      && /Rent/.test(hero)
      && /Buy/.test(hero)
      && /Any/.test(hero)
      && /disabled/.test(hero)
      && /Free\/rent\/buy modes are not tracked yet\./.test(hero)
      && /aria-label="Clear Discover filters"/.test(hero)
      && /openStreamingSettings/.test(hero)
      && /emit\("open-settings", "streaming"\)/.test(hero)
      && /white-space: nowrap/.test(hero)
      && /overflow-x: auto/.test(hero)
      && /:highlight-active="false"/.test(hero)
      && /control-chip--dropdown\.is-active/.test(filterMenu),
  },
  {
    name: 'Movie detail profile chips/evidence/provider targets are ready for phone tapping',
    pass: () => /class="profile-glance-pill"/.test(modal)
      && /type="button"/.test(modal)
      && /:aria-pressed="profile\.id === selectedDetailProfileId/.test(modal)
      && /@click="selectedDetailProfileId = profile\.id"/.test(modal)
      && /Compatible with: <strong>{{ selectedDetailProfileName }}<\/strong>/.test(modal)
      && /scoreLabel: hasMovieScore \? `\$\{formatScore\(rawScore\)\}\/5` : "Unknown"/.test(modal)
      && /class="mat-ext-link"/.test(modal)
      && /class="provider-chip"/.test(modal)
      && /\.profile-glance[\s\S]*overflow-x: auto/.test(modal)
      && /\.profile-glance-pill[\s\S]*min-height: 34px/.test(modal)
      && /\.mat-ext-link[\s\S]*min-height: 34px/.test(modal)
      && /\.provider-chip[\s\S]*min-height: 34px/.test(modal),
  },
  {
    name: 'Mobile modal surface keeps full-screen and fixed-close safeguards',
    pass: () => /height: 100dvh/.test(modal)
      && /-webkit-overflow-scrolling: touch/.test(modal)
      && /\.modal-close--mobile[\s\S]*position: fixed/.test(modal)
      && /\.modal-close--mobile[\s\S]*width: 44px/.test(modal)
      && /\.modal-close--mobile[\s\S]*height: 44px/.test(modal),
  },
  {
    name: 'Settings Lists and list recovery copy are ready for phone scanability checks',
    pass: () => /class="list-row"/.test(settings)
      && /role="link"/.test(settings)
      && /tabindex="0"/.test(settings)
      && /list-row__open/.test(settings)
      && /list-row__actions/.test(settings)
      && /@click\.stop @keydown\.stop/.test(settings)
      && /\.list-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/.test(settings)
      && /\.list-row__actions[\s\S]*grid-column: 1 \/ -1/.test(settings)
      && /Profile needed/.test(listView)
      && /List not in this profile/.test(listView),
  },
];

let failed = 0;
for (const check of checks) {
  try {
    const result = await check.pass();
    if (result === false) throw new Error('source/readiness assertion returned false');
    console.log(`✓ ${check.name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${check.name}`);
    console.error(`  ${error.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} phone/touch readiness check(s) failed against ${baseUrl}.`);
  process.exit(1);
}

console.log(`\nPhone/touch readiness checks passed against ${baseUrl}.`);
console.log('\nManual phone checklist still required on a real device:');
console.log(`- ${baseUrl}/discover — availability dropdown readability, disabled modes, Movie/TV toggles, clear chip, no wrapping/overflow.`);
console.log(`- ${baseUrl}/discover — open a movie detail; tap profile chips, maturity evidence links, provider chips, and close.`);
console.log(`- ${baseUrl}/settings/lists — list row boundaries, row-open affordance, secondary actions.`);
console.log(`- ${baseUrl}/lists/bad-id — profile/list gate copy readability.`);
