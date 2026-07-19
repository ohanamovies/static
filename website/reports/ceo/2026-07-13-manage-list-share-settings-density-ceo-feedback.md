# CEO feedback report — Manage-list share and Settings density

Date: 2026-07-13 10:38 Europe/Madrid
Source: Alex product review, Telegram messages #2523/#2526
Status: Documented after direct implementation. Future CEO/product feedback should route through this report/planning path before implementation unless Alex explicitly asks for a hotfix.

## Raw feedback

- “Share button on manage list doesn’t do anything.”
- “Settings list is too loaded.”
- “Make it 2 lines — the 3rd one doesn’t add much — delete.”
- Follow-up process correction: “You should have written a report with ceo assistant in Ohana repo for the team to drive.”

## Executive interpretation

This is partly a product bug and partly a team-process bug.

Product-wise, the lists surface violated trust: a visible **Share** action that appears inert teaches users not to trust list collaboration. Settings also drifted back toward over-explaining; the index should be a fast routing surface, not a miniature report per row.

Process-wise, CEO/product review needs to be captured as durable team input first, then routed into PM/design/engineering docs. Direct fixes are acceptable only for explicit hotfixes or tiny P0s, and even then the report should exist so the team can audit why the change happened.

## Required PM/vision response

- Treat list sharing as a trust-sensitive interaction: if the action exists, it must produce a visible system share/copy outcome or a recoverable fallback.
- Settings index rows should remain compact routing rows. Two-line row treatment is the product target: section label + current value/title. Avoid explanatory third-line summaries unless a row truly needs warning/error context.
- Add this to acceptance criteria if not already explicit: Settings is an index, not a form dump or explanatory surface.

## Required UX/design response

- Settings rows should scan as two-line items by default:
  - line 1: label/category
  - line 2: current state/title
- Third-line helper copy is noise on the Settings home and should move into the dedicated settings subroute when needed.
- Share actions need immediate feedback:
  - native share sheet when available
  - clipboard confirmation when falling back
  - manual copy prompt only as last resort

## Required principal-engineer response

- Record the hotfix as a contained implementation slice in `VISION_EXECUTION.md`.
- Ensure the list share action uses the platform Web Share API when available, with clipboard fallback and manual fallback for blocked clipboard environments.
- Ensure `SettingsRow` no longer renders the low-value `summary` line on the Settings index.
- Keep `summary` optional/backward-compatible only if existing call sites still pass it; do not make callers churn unless there is a cleanup slice.
- Run `pnpm build` / `npm run build` after the change.

## Suggested priority

- P0 — Share button appears broken/inert on manage-list surface.
- P1 — Settings index density: remove third line and preserve compact routing-list behavior.
- P1 — Process correction: CEO feedback must be reported and linked before team-driving changes.

## Non-goals

- Do not redesign list ownership, permissions, or backend collaboration semantics as part of this feedback.
- Do not add more copy to Settings to compensate for removed summaries.
- Do not introduce a custom share modal unless native share + clipboard + prompt fallback proves insufficient.
