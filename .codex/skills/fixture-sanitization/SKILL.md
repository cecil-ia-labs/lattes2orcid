---
name: fixture-sanitization
description: Use when preparing Lattes XML fixtures for version control, removing personal identifiers while preserving bibliographic structure, parser coverage, and realistic attribute layouts.
---

# Fixture Sanitization

Use this skill whenever a real Lattes XML file is being prepared for tests or documentation.

## Remove Or Replace

- `CPF`
- identity or passport numbers
- parent names
- street addresses, CEP, neighborhood, phone, fax, ramal
- personal emails
- direct contact fields and residential data

## Preserve

- Root structure and element ordering
- Bibliographic sections and metadata shape
- Author arrays and citation names
- Publication identifiers like DOI, ISBN, ISSN, ORCID when intentionally retained
- Enough academic history to keep the fixture realistic for parser tests

## Workflow

1. Sanitize the raw XML into a separate versioned fixture.
2. Keep the private source outside tracked history.
3. Add synthetic fixtures only for categories missing from the real sanitized sample.
4. Re-run parser tests after each sanitization change to avoid damaging structure.

## Script Hook

- Preferred utility path: `scripts/sanitize-lattes-fixture.ts`
