---
name: screenshot-ui-debug
description: Use when a UI screenshot is provided and you need to analyze layout, hierarchy, spacing, typography, responsiveness, or likely visual bugs in a React/styled-components app.
---

# Screenshot UI Debug

Use this skill when the user provides a screenshot and wants a visual diagnosis or UI improvement plan.

## Goal

Turn a screenshot into a concrete UI/debug report that identifies:

- layout structure
- component roles
- visual hierarchy
- spacing and alignment issues
- typography problems
- responsive risks
- likely root causes in code

## Workflow

1. Read the screenshot as a product artifact, not just an image.
2. Identify the major regions, then the smaller components inside each region.
3. Compare the screenshot against the intended UI state or the current code structure when available.
4. Call out what looks broken, what looks weak, and what looks intentional.
5. Convert visual findings into actionable fixes.

## Debug Focus

- clipping, overflow, and scroll issues
- broken flex/grid alignment
- incorrect spacing tokens or padding
- font sizing, line height, and weight mismatches
- color contrast and state visibility
- mobile breakpoints and touch targets
- z-index, layering, and modal overlap problems

## Output Standard

- Start with the highest-severity visual issues.
- For each issue, include the likely cause and the first fix to try.
- Keep the report concise and implementation-ready.
- If the screenshot is ambiguous, state the uncertainty instead of guessing.

