---
name: deployment-privacy
description: Use when making architectural or implementation decisions that affect upload privacy, server retention, logging, deployment configuration, and public release safety for the Lattes2BibTeX webtool.
---

# Deployment Privacy

Use this skill when a change may affect what user data touches the server or repository.

## Hard Requirements

- No cookies
- No authentication requirement for conversion
- No database persistence
- No raw XML or generated BibTeX stored after the response completes
- No raw upload content in logs
- Explicit upload size limit

## Runtime Expectations

- Process uploaded files in memory only
- Return structured validation errors
- Keep server behavior stateless and disposable
- Document privacy guarantees in `README.md`

## Public Release Checklist

- `.gitignore` excludes private raw fixtures and local build artifacts
- Sanitized fixtures are the only versioned samples
- Deployment target supports Node runtime without introducing storage side effects
- Manual verification confirms that ORCID import workflow still works with generated BibTeX
