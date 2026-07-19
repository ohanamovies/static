# CEO feedback report — Dropdown filters

Date: 2026-07-13 19:32 Europe/Madrid
Source: Alex product review, Telegram message 2601
Status: P0 implementation explicitly requested by Alex.

## Raw feedback

- Dropdown filters still don’t work.
- Dropdown options don’t come up.
- Fix this with top priority because it is one of the key things people notice when trying Ohana.

## Executive interpretation

The Discover controls are currently trust-breaking: chips appear interactive, but the menu options are not reliably visible/usable. This undermines the first-run impression because filters are prominent above the core recommendation experience.

## Required PM/vision response

- Keep “Chip dropdowns must work reliably” as acceptance criteria in `VISION.md`.
- Treat broken primary controls as P0 above cosmetic cleanup or secondary settings refinements.

## Required UX/design response

- Dropdown chips must behave like real controls on mobile and desktop: tap opens a visible menu, options are selectable, and the menu is not clipped by horizontal chip scrolling.

## Required principal-engineer response

- Prioritize a robust menu-positioning fix for shared dropdown chips.
- Verify Discover dropdowns in-browser, especially mobile-width layouts where the chip row scrolls horizontally.

## Suggested priority

- P0 — Discover dropdown menus do not reliably appear; key first-impression control is broken.
- P1 — Add/keep regression coverage for menu visibility in mobile viewport.
- P2 — Continue lower-priority control polish after the P0 interaction works.

## Non-goals

- Do not expand backend availability semantics as part of this bug.
- Do not add new filter categories.
- Do not redesign the Discover control set beyond making existing dropdowns reliably usable.
