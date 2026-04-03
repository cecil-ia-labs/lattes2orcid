---
name: orcid-oauth-write-path
description: Use when designing the ORCID OAuth and write path for Lattes2ORCID, including token exchange, stateless gateway contracts, and privacy constraints.
---

# ORCID OAuth Write Path

Use this skill when the work touches login, token exchange, record updates, or write safety.

## Hard Constraints

- Do not put `client_secret` in the browser.
- Keep the gateway minimal and stateless.
- Do not persist raw XML, diffs, or ORCID payloads.
- Do not log sensitive XML or token content.
- Use HTTPS redirect URIs only.

## Workflow

1. Assume the user authenticates with ORCID via OAuth.
2. Exchange code for token in a safe write path, not in the front-end.
3. Read the ORCID record before writing.
4. Reuse put-codes for updates.
5. Reject writes that would overwrite another source unless the user explicitly reviews them.

## Implementation Notes

- Treat `read-limited`, `activities/update`, and `person/update` as the baseline scope set.
- Keep session state ephemeral.
- Return structured errors for auth, scope, and ownership failures.

