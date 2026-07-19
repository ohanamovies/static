# CEO feedback report — Settings lists open/copy-share

Date: 2026-07-13 11:59 Europe/Madrid
Source: Alex product review, Telegram message #2555
Status: Documented for planning. Do **not** implement immediately unless Alex explicitly asks for a hotfix.

## Raw feedback

- “On settings > lists, I should be able to click a list and see the movies there.”
- “On share lists, instead of showing the link to copy just copy it and provide nice feedback.”
- “Change ‘shared’ with ‘copied’ for 1 second.”
- “Use the ceo asssistsnt agent to cascade the feedback appropriately.”

## Executive interpretation

Settings → Lists is currently too much like an admin table. A list row represents a user-owned collection, so the natural primary action is opening that list and seeing its movies. Management actions should remain secondary.

Share should also behave like a modern copy action, not expose a raw URL or force a manual copy step in the happy path. The user should press Share/Copy, the link should be copied automatically, and the UI should briefly confirm with **Copied**.

## Required PM/vision response

- Treat Settings → Lists rows as navigational list entries: clicking/tapping the list opens the dedicated `/lists/:listId` poster-grid view.
- Keep Rename/Remove/etc. as secondary actions that do not fight the primary row-open behavior.
- For list sharing, make clipboard-copy the primary success path for this surface.
- Do not show a raw share URL as normal UI after pressing Share; only use manual URL prompts as a last-resort fallback when clipboard access fails.
- Feedback copy should say **Copied**, not **Shared**, and clear after about 1 second.

## Required UX/design response

- List rows in Settings should scan as tappable rows with a clear title/count and secondary inline actions.
- Avoid turning sharing into a text/link-management task. The interaction should be button → copied → brief confirmation.
- Confirmation should be lightweight and local to the action, not a modal/toast that interrupts the list-management flow.

## Required principal-engineer response

- Add a small implementation slice for `/settings/lists`:
  - make the list title/row navigate to `/lists/:listId`;
  - prevent Rename/Share/Remove clicks from also triggering navigation;
  - update the share handler to clipboard-first copy behavior;
  - show **Copied** for ~1000ms;
  - keep prompt/manual fallback only for clipboard failures;
  - preserve existing list token/share URL generation and profile/list persistence.
- Verification: `npm run build`; route smoke `/settings/lists`, `/lists/bad-id`, and at least one real `/lists/:listId` when a local profile/list exists; manual clipboard fallback check where possible.

## Suggested priority

- P1 — Settings list rows should open the list contents; this is a direct path from configuration to consumption.
- P1 — Share should copy automatically with clear **Copied** feedback; exposing raw links is clunky and trust-reducing.

## Non-goals

- Do not redesign list ownership, collaboration, permissions, or delete semantics.
- Do not add a custom share modal.
- Do not change the `/lists/:listId` page from a complete poster-grid view.
- Do not rewrite profile/list persistence or KV merge behavior.
