# Ohana Vision Execution

This is now a **thin execution index**, not a rolling dump. Keep it short so agents do not waste context on obsolete slice logs.

## Objective

Deliver `VISION.md` incrementally: Discover/Search/Settings IA, discovery-first CX, dedicated Search intent, Settings as permanent configuration, and clearer appropriateness/availability/list signals.

## Read path for agents

1. Start here.
2. Read [`docs/vision-execution/current-status.md`](docs/vision-execution/current-status.md) for the active state and next useful slices.
3. Read [`docs/vision-execution/sprint-plan.md`](docs/vision-execution/sprint-plan.md) only when planning or selecting a roadmap slice.
4. Read [`docs/vision-execution/review-index.md`](docs/vision-execution/review-index.md) only when the task touches CEO/PM/QA feedback.
5. Do **not** read archived logs unless auditing history or debugging a regression.

## Sprint completion contract

Each sprint must end with a working website version: implementation complete, verification passed, Vite dev server reachable at `http://100.85.92.106:5173/`, execution docs updated so completed items and next steps are clear, and changes committed and pushed to the origin `main` branch.

## Current focus

Current sprint: **Sprint 9 — PM/QA trust, retrieval, and accessibility follow-ups**.

Latest CEO walk-the-store feedback is routed through the independent principal engineer plan: [`reports/principal-engineer/2026-07-18-ceo-walk-store-execution-plan.md`](reports/principal-engineer/2026-07-18-ceo-walk-store-execution-plan.md). Prioritize its slices before broad modal QA: Discover chip semantics/poster-card redundancy, movie-detail suitability profile chips, maturity evidence/provider cleanup, and Settings → Lists row affordance.

Prior CEO feedback routed for principal SDE review: [`reports/ceo/2026-07-14-movie-detail-filter-chips-ceo-feedback.md`](reports/ceo/2026-07-14-movie-detail-filter-chips-ceo-feedback.md). Its quick fixes are subsumed by the latest walk-the-store plan where overlapping.

Recently landed:

- CEO dropdown-filter fix: Discover dropdown menus render selectable options again; remaining work there is manual phone/touch verification only.
- Exact-title Search ranking now prefers canonical user intent; `/search?q=godfather` puts **The Godfather** (1972) first.
- Discover’s first recommendation row is profile-aware.
- Primary Discover control chrome is normalized to English.
- Movie-detail suitability reasoning now stays visible for Adults/no-limit profiles with explicit **No limit set** category rows.
- Search result cards now annotate abstract availability from existing provider bitmasks only, and their non-destructive hover/active border feedback uses teal/neutral instead of red.
- Settings-route visible inputs were audited as label-wrapped, and non-destructive focus indicators in Search/Settings now use teal instead of red.
- List/profile gate copy now distinguishes no-profile setup from wrong-profile/list-not-attached states on Settings → Lists and `/lists/:listId`.
- Discover availability/filter-chip semantics now use `Flatrate`/`Any`, disabled future availability modes, a Settings streaming link, icon-only clear, no selected-chip × glyphs, and suppressed tautological Discover poster fit badges.
- Movie-detail suitability/profile chips are tappable drill-down controls that switch the modal reasoning profile without changing the active Discover profile.
- Movie-detail maturity evidence/progress rows now merge into the selected-profile reasoning table, external parental-guide links are easier to tap, and the redundant provider summary sentence is gone.
- Movie-detail modal QA coverage now has `npm run qa:modal`, checking dialog semantics, close controls, focus/scroll lifecycle, suitability profile chips/reasoning, maturity evidence links, availability rows, and mobile full-screen behavior.
- Settings → Lists rows now have clearer boundaries, navigational affordance, separated management actions, focus/hover states, and mobile wrapping.
- Sprint 9 trust/source QA coverage now has `npm run qa:sprint9`, checking Discover availability/chip semantics, tautological poster-fit suppression vs Search annotations, Settings → Lists navigation affordance/action isolation, and list/profile gate copy.
- Mobile/touch source QA coverage now has `npm run qa:mobile-touch`, checking Discover chip/dropdown touch safeguards, non-sticky hover semantics, movie-detail full-screen/tap-target safeguards, Settings → Lists mobile rows, and list/profile recovery paths.
- Dev route smoke coverage now has `npm run qa:dev-routes`, checking the reachable Vite/static shell for Discover, Search deep links, Settings subroutes, list recovery, and runtime catalog data.
- Phone/touch readiness coverage now has `npm run qa:phone-touch`, checking the reachable phone-review routes plus source safeguards for Discover dropdowns, movie-detail profile/evidence/provider tap targets, full-screen modal behavior, Settings → Lists scanability, and list-gate copy; it prints the remaining real-device checklist.

Next useful slices:

1. Run the `npm run qa:phone-touch` checklist on a real phone via `http://100.85.92.106:5173/` and record pass/fail findings for Discover availability/dropdown selected-state readability, movie-detail profile chips, maturity evidence rows, provider chips, list/profile gate copy, and Settings → Lists row scanability.

## Durable agent prompts

- CEO assistant: [`agents/ceo-assistant.md`](agents/ceo-assistant.md)
- PM-tech reviewer: [`agents/pmt.md`](agents/pmt.md)
- Principal engineer: [`agents/principal-engineer.md`](agents/principal-engineer.md)
- QA/CX reviewer: [`agents/qa.md`](agents/qa.md)

## Deferred / do not do yet

- Do not implement true Included/Free/Rent/Buy provider grouping until backend/scraper data supports it.
- Do not implement real person/studio search without backend data.
- Do not implement list ownership/delete semantics beyond current rename/remove-from-profile language.
- Do not rewrite profile/list persistence or KV merge behavior as part of UI cleanup.
- Do not deploy externally unless Alex asks.

## Maintenance rule

Do not append long slice logs here. When detail is no longer immediately useful, move it under [`docs/vision-execution/archive/`](docs/vision-execution/archive/) and keep this file as the current-state router.
