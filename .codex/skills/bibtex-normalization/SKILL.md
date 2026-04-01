---
name: bibtex-normalization
description: Use when converting normalized publication records into BibTeX, choosing entry types, normalizing fields, generating stable citekeys, escaping values, and validating serialized BibTeX output.
---

# BibTeX Normalization

Use this skill when the repository needs consistent BibTeX output instead of ad hoc string assembly.

## Entry Mapping Defaults

- `TRABALHO-EM-EVENTOS` -> `@inproceedings`
- `ARTIGO-PUBLICADO` -> `@article`
- `ARTIGO-ACEITO-PARA-PUBLICACAO` -> `@unpublished`
- `LIVRO-PUBLICADO-OU-ORGANIZADO` -> `@book`
- `CAPITULO-DE-LIVRO-PUBLICADO` -> `@incollection`
- `TEXTO-EM-JORNAL-OU-REVISTA` -> `@article`
- Remaining bibliographic branches -> `@misc`

## Field Priorities

- Always prefer: `author`, `title`, `year`
- Preserve when available: `journal`, `booktitle`, `publisher`, `address`, `volume`, `number`, `pages`, `doi`, `isbn`, `issn`, `url`, `language`, `note`
- Keep original subtype or unsupported detail in `note` rather than dropping it

## Citekeys

- Generate stable keys from year + first author surname + normalized title fragment
- Remove diacritics and punctuation
- Add numeric suffixes for collisions
- Never rely on opaque random IDs for primary citekeys

## Serialization Rules

- Escape characters that would break BibTeX syntax
- Omit empty fields
- Preserve multiline notes as plain whitespace-normalized text
- Re-parse generated output during tests to catch syntax regressions
