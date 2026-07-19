# Current vision execution status

Last reorganized: 2026-07-13.

## Current CX vs Vision status
- Delivered: primary Discover/Search/Settings IA, route-backed tabs, bottom navigation, Search as vertical retrieval, reusable Search input primitive, Search landing recents, Settings deep links, native profile/list/maturity settings routes, custom maturity profile create/duplicate/rename/delete, Discover list integration, dedicated `/lists/:listId` poster-grid browsing, temporary vs permanent filter separation, compact mobile Discover hierarchy, persisted maturity profile selection/presets, clearer profile-aware suitability/availability/list signals in cards/details, movie-detail maturity hierarchy with raw parental-guide detail secondary, a narrowed shared-list invite modal instead of duplicate broad Settings modal UI, and `UiChip` support for semantic links plus buttons.
- Partial: manual mobile review is still needed for the new list grid, bottom-nav interaction, movie detail full-screen/close-button behavior, narrowed shared-list invite flow, lightweight structured Search sections/deep links/no-results state, the stacked mobile From your lists row actions, the Search no-mobile-autofocus/recent-chip/touch-card behavior, the flatter Settings subroutes, and the Discover hero after removing the redundant Settings shortcut.
- CEO feedback status: implemented locally: manage-list share behavior, Settings index two-line density, shorter **Available on …** row titles, duplicate movie-detail availability removal, cross-profile suitability glance, subtle row-title list selector, Settings → Lists row-open navigation plus clipboard-first **Copied** share feedback, and restored Discover dropdown menu options. Implemented locally: source-level chip/dropdown color semantics now keep non-destructive selected/hover states teal or neutral, with red reserved for danger/destructive states. Newly routed for principal SDE review: tappable movie-detail suitability chips that reveal per-profile details, removal of redundant Suitability/list boxes, touch-safe chip hover behavior, an edit-platforms link in the platforms dropdown, **Allowed n (label)** maturity copy, and suppression of tautological poster fit labels under active maturity filters. Still open: manual phone/touch verification of dropdown behavior and selected-state readability.
- PM/QA follow-up backlog: visible suitability reasoning for Adults/no-limit profiles, broader Search ranking regression review beyond the fixed exact-title `godfather` case, abstract availability annotations in Search results without provider-name clutter, non-destructive Search result hover/active colors, Settings input-label verification, list/profile gate copy, and modal-specific QA coverage.
- Deferred: true backend-backed collection/person search, true Included/Free/Rent/Buy provider groups, list ownership/delete semantics, and backend/scraper data changes.

## Active sprint

**Sprint 9 — PM/QA trust, retrieval, and accessibility follow-ups.**

Recently landed:

- Slice 73: exact-title search ranking now prefers canonical intent; `/search?q=godfather` ranks **The Godfather** (1972) first.
- Slice 74: Discover first row is profile-aware and primary Discover controls are normalized to English.
- Slice 75: Movie-detail suitability reasoning stays visible for Adults/no-limit profiles with explicit **No limit set** category rows.
- Slice 76: Search result cards show abstract availability annotations from existing provider bitmasks only, and Search result hover/active borders now use teal/neutral feedback instead of red.
- Slice 77: Settings-route visible text inputs were verified as label-wrapped, and remaining non-destructive focus affordances in `SearchBox`, Settings form inputs, and `SettingsRow` chevrons/outlines now use teal instead of red.
- Slice 78: list/profile gate copy now distinguishes no-profile setup from wrong-profile/list-not-attached states on Settings → Lists and `/lists/:listId`.
- Slice 79: Discover availability/filter-chip semantics now use `Flatrate`/`Any`, disabled future availability modes, a Settings streaming link, icon-only clear, no selected-chip × glyphs, and suppressed tautological Discover poster fit badges.
- Slice 80: Movie-detail suitability/profile chips are tappable drill-down controls that refresh the modal reasoning profile without changing the active Discover profile; redundant Suitability/list summary boxes were removed.
- Slice 81: Movie-detail maturity evidence/progress rows now live in the selected-profile reasoning table with one-decimal scores, allowed-level copy, tags, parental-guide links, larger external-link tap targets, and no redundant provider summary sentence above provider chips.
- Slice 82: Added `npm run qa:modal` source-level coverage for movie-detail dialog semantics, close controls, focus/scroll lifecycle, local suitability profile chips/reasoning, maturity evidence links, provider availability rows, and mobile full-screen behavior.
- Slice 83: Settings → Lists rows now have clearer navigational affordance, row boundaries, focus/hover states, separated management actions, compact open affordance, and mobile action wrapping.
- Slice 84: Added `npm run qa:sprint9` source-level coverage for Discover availability/chip semantics, tautological poster-fit suppression vs Search annotations, Settings → Lists navigation affordance/action isolation, and list/profile gate copy.
- Slice 85: Added `npm run qa:mobile-touch` source-level coverage for mobile/touch safeguards across Discover chips/dropdowns, non-sticky hover semantics, movie-detail full-screen close/profile/evidence/provider tap targets, Settings → Lists mobile rows, and list/profile gate recovery paths. Also increased key movie-detail mobile tap targets.
- Slice 86: Added `npm run qa:dev-routes` dev-server smoke coverage for the Vite/static shell on Discover, Search query deep links, Settings subroutes, missing-list recovery, and `movies.json` runtime data.
- Slice 87: Added `npm run qa:phone-touch` phone/touch readiness coverage for the reachable phone-review routes, Discover dropdown semantics, movie-detail profile/evidence/provider tap targets, full-screen modal safeguards, Settings → Lists scanability, and list-gate copy. Also increased maturity evidence link tap targets to 34px.

Next useful slices:

1. Run the `npm run qa:phone-touch` checklist on a real phone via `http://100.85.92.106:5173/` and record pass/fail findings for Discover availability/dropdown selected-state readability, movie-detail profile chips, maturity evidence rows, provider chips, list/profile gate copy, and Settings → Lists row scanability.

## Do not do yet
- Do not implement true Included/Free/Rent/Buy provider grouping until backend/scraper data supports it.
- Do not implement real person/studio search without backend data.
- Do not implement list ownership/delete semantics beyond current rename/remove-from-profile language.
- Do not rewrite profile/list persistence or KV merge behavior as part of UI cleanup.
- Do not deploy externally unless Alex asks.

## Notes / assumptions
- Keep implementation local and reviewable; no external deploy until asked.
- Preserve current Pinia stores and KV merge behavior.
- Use existing data fields; do not invent backend support for availability categories.
- Search is now first-class visually; collection/person structured results remain future/backend work except for a limited inferred-collection prototype.
- Settings is now first-class as an index, and core profile/list/maturity edit flows have route-backed pages; any remaining `ConfigModal.vue` dependency should be audited before removal.
- Provider subscriptions now live visually in Settings, but still reuse the existing `selectedProviders` persistence path for compatibility.
- Named maturity profiles now persist as profile presets in `filterPrefs.maturityProfiles`; custom create/duplicate/rename/delete UI exists in `/settings/maturity`.
- Latest remaining priority: use `npm run qa:phone-touch` as the real-device phone checklist, then record any concrete pass/fail findings. Avoid reopening completed CEO layout/dropdown/list-gate/detail changes unless manual QA finds a regression.
