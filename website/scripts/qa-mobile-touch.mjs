#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const hero = read('src/components/HeroSection.vue');
const filterMenu = read('src/components/FilterMenu.vue');
const uiChip = read('src/components/UiChip.vue');
const modal = read('src/components/MovieModal.vue');
const settings = read('src/components/SettingsView.vue');
const listView = read('src/views/ListView.vue');

const heroMobileCss = hero.match(/@media \(max-width: 640px\)[\s\S]*?\n\}/)?.[0] || '';
const modalMobileCss = modal.match(/@media \(max-width: 560px\)[\s\S]*?\n\}/)?.[0] || '';
const settingsMobileCss = settings.match(/@media \(max-width: 720px\)[\s\S]*?\n\}/)?.[0] || '';
const profileRailCss = modal.match(/\.profile-glance\s*\{[\s\S]*?\n\}/)?.[0] || '';
const profileChipCss = modal.match(/\.profile-glance-pill\s*\{[\s\S]*?\n\}/)?.[0] || '';
const providerChipCss = modal.match(/\.provider-chip\s*\{[\s\S]*?\n\}/)?.[0] || '';
const guideLinkCss = modal.match(/\.guide-link\s*\{[\s\S]*?\n\}/)?.[0] || '';

const checks = [
  {
    name: 'Discover chips have explicit mobile nowrap touch-target protection',
    pass: /\.chip-row\s*\{[\s\S]*overflow-x: auto/.test(heroMobileCss)
      && /\.control-chip, \.clear-btn\s*\{[\s\S]*min-height: 36px[\s\S]*white-space: nowrap/.test(heroMobileCss)
      && /\.chip-label-with-icon\s*\{[\s\S]*white-space: nowrap/.test(hero)
      && /\.clear-btn--icon\s*\{[\s\S]*width: 38px/.test(hero),
  },
  {
    name: 'Discover availability dropdown is touch-safe and routes to streaming Settings',
    pass: /@click="openStreamingSettings"/.test(hero)
      && /emit\("open-settings", "streaming"\)/.test(hero)
      && /aria-label="Clear Discover filters"/.test(hero)
      && /role="menuitemradio" aria-checked="false" disabled/.test(hero)
      && /\.menu-option:disabled, \.menu-option:disabled:hover\s*\{[\s\S]*not-allowed[\s\S]*rgba\(30,30,42,0\.86\)/.test(hero)
      && !/\.menu-option:disabled[\s\S]{0,160}(#f|red|--danger)/i.test(hero),
  },
  {
    name: 'Dropdown chips avoid selected-green stickiness while toggle chips keep selected semantics',
    pass: /:highlight-active="false"/.test(hero)
      && /highlightActive: \{ type: Boolean, default: true \}/.test(filterMenu)
      && /:active="open \|\| \(highlightActive && active\)"/.test(filterMenu)
      && /\.control-chip--dropdown\.is-active,[\s\S]*background: rgba\(255,255,255,0\.1\)/.test(filterMenu)
      && /\.control-chip--primary\.active, \.control-chip--primary\.is-active\s*\{[\s\S]*var\(--teal\)/.test(hero)
      && /@media \(hover: hover\)/.test(uiChip),
  },
  {
    name: 'Movie detail mobile surface uses full viewport and fixed close affordance',
    pass: /\.modal-backdrop\s*\{[\s\S]*height: 100dvh[\s\S]*overflow: hidden/.test(modal)
      && /\.modal\s*\{[\s\S]*height: 100dvh[\s\S]*overflow-y: auto[\s\S]*-webkit-overflow-scrolling: touch/.test(modal)
      && /\.modal-close--mobile\s*\{[\s\S]*position: fixed/.test(modal)
      && /\.modal-close--mobile\s*\{[\s\S]*width: 44px[\s\S]*height: 44px/.test(modalMobileCss),
  },
  {
    name: 'Movie detail profile chips are touch-scrollable, single-line selectable controls',
    pass: /type="button"/.test(modal)
      && /:aria-pressed="profile\.id === selectedDetailProfileId/.test(modal)
      && /@click="selectedDetailProfileId = profile\.id"/.test(modal)
      && /overflow-x: auto/.test(profileRailCss)
      && /scrollbar-width: none/.test(profileRailCss)
      && /white-space: nowrap/.test(profileChipCss)
      && /min-height: 34px/.test(profileChipCss),
  },
  {
    name: 'Movie detail evidence/provider links have mobile-friendly tap areas',
    pass: /\.modal-meta\s*\{[\s\S]*flex-wrap: wrap/.test(modal)
      && /\.imdb-link,[\s\S]*\.ext-site-link\s*\{[\s\S]*min-height: 34px/.test(modal)
      && /min-height: 34px/.test(providerChipCss)
      && /\.provider-chip-remove\s*\{[\s\S]*min-width: 26px[\s\S]*min-height: 26px/.test(modal),
  },
  {
    name: 'Settings Lists mobile rows keep boundaries, navigation affordance, and separated actions',
    pass: /class="list-row"/.test(settings)
      && /role="link"/.test(settings)
      && /tabindex="0"/.test(settings)
      && /list-row__open/.test(settings)
      && /list-row__actions/.test(settings)
      && /@click\.stop @keydown\.stop/.test(settings)
      && /\.list-row\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/.test(settingsMobileCss)
      && /\.list-row__actions\s*\{[\s\S]*grid-column: 1 \/ -1[\s\S]*border-top/.test(settingsMobileCss),
  },
  {
    name: 'List/profile gate copy remains terse and route-backed for mobile recovery paths',
    pass: /Profile needed/.test(listView)
      && /List not in this profile/.test(listView)
      && /missingListActionTo = computed\(\(\) => userStore\.isLoggedIn \? "\/settings\/lists" : "\/settings\/profile"\)/.test(listView)
      && /@media \(max-width: 640px\)[\s\S]*\.list-page/.test(listView),
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
  console.error(`\n${failed} mobile/touch source QA check(s) failed.`);
  process.exit(1);
}

console.log('\nMobile/touch source QA checks passed.');
