---
name: orcid-wizard-ui-figma
description: Use when creating or updating the ORCID v2 wizard UI in Figma, including screen structure, review states, and design-system-aware layout.
---

# ORCID Wizard UI for Figma

Use this skill when building the new v2 wizard screens or translating them into Figma.

## Workflow

1. Inspect the current app structure and the v2 step model.
2. Build the wizard as a clear sequence: upload, coverage, login, consent, review, manual queue, sync, report.
3. Use the Figma design-system workflow before drawing raw shapes when reusable components exist.
4. Keep mobile and desktop layouts distinct, but visually consistent.

## Design Rules

- Emphasize privacy, clarity, and trust.
- Make `automatic`, `needs review`, and `manual` states visually distinct.
- Keep actions short and unambiguous.
- Show the ORCID benefit and consent boundaries before login.

## Figma Guidance

- Use `figma-use` for any write action.
- Use `figma-generate-design` when translating a running web screen into a design artifact.
- Return node IDs for every created or mutated element.

