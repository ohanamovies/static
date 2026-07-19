# Ohana TV Coding Standards

For product design rationale, screen intent, visual hierarchy, and the critique checklist, see [`DESIGN_GUIDELINES.md`](./DESIGN_GUIDELINES.md). This file translates those principles into implementation standards.

## Reusable UI first

If the same UI pattern appears twice, make or reuse a component.

Core primitives that should not be copy-pasted:

- Bottom navigation tab/icon button
- Search input/search bar
- Settings index row
- Chip/filter pill
- Section header
- Metadata/status badge
- Poster/title card shell

Keep component APIs small and product-named. Example: `SettingsRow`, not `BoxThing`.

## No boxes inside boxes

Avoid nested cards/panels/wrappers unless each container has a distinct job.

Preferred hierarchy:

1. Page title/primary action
2. Lightweight sections
3. Rows/items
4. Detail surfaces only when needed

Use spacing, typography, and grouping before borders and backgrounds.

## Discover rows

Row generation must keep the first screen diverse:

- A movie/show cannot appear in the first two positions of more than one Discover row.
- Dedupe rows by stable id/title before slicing visible results.
- If preserving a title matters for a later row, push it deeper instead of showing it again near the start.

## Cards/posters

Poster cards are for recognition and quick choice, not full metadata.

Allowed on cards:

- Poster
- Title
- Year/rating
- Suitability/fit signal when useful

Do not show streaming platforms on cards. Platforms belong in detail view.

## Search

Search is retrieval. The search bar starts at the top of the Search view.

Do not put the search box inside a decorative wrapper card. Results should be vertical and scannable.

## Settings

Settings home is an index, not a form dump.

Use compact two-line rows: label/category plus current state/title, with a chevron/action affordance. Do not render routine third-line helper copy on the Settings home; put explanation inside dedicated routes/screens.

## Bottom navigation

Bottom tabs are icon-only.

- No text labels.
- No emojis.
- Use Material Design Icons or equivalent SVG/icon components.
- Keep icon sizes, visual weight, selected state, and tap targets consistent.

## Chips

Chips must stay one line.

- Use `white-space: nowrap`.
- Prefer short labels.
- Truncate if needed.
- Move long explanatory text into a menu, sheet, or detail surface.

## Verification

For UI changes, run at least:

```bash
npm run build
```

When changing routing or app shell behavior, also smoke-test the main routes locally.
