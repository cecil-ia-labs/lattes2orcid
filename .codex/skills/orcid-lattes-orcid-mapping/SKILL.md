---
name: orcid-lattes-orcid-mapping
description: Use when mapping Plataforma Lattes XML or XSD structures into ORCID sections, ownership states, and review/manual queues for Lattes2ORCID v2.
---

# Lattes to ORCID Mapping

Use this skill when the task is to turn Lattes XML into ORCID-ready domain objects.

## Source Of Truth

- `assets/xml_cvbase_src_main_resources_CurriculoLattes.xsd`
- Sanitized real fixture in `fixtures/lattes/real/sanitized-lattes.xml`
- Existing `src/lib/lattes/*` extraction and normalization code

## Rules

- Preserve author and item order.
- Keep raw provenance for every mapped field.
- Prefer explicit mapping tables over heuristics.
- Classify each item as `auto-sync`, `review-required`, or `manual-only`.
- Move unsupported or low-confidence data to a manual queue instead of dropping it.

## Mapping Focus

- `FORMACAO-ACADEMICA-TITULACAO` -> `education` or `qualification`
- `ATUACOES-PROFISSIONAIS` -> affiliation or activity sections
- `PREMIOS-TITULOS` -> `distinction`
- `AREAS-DE-ATUACAO` and keywords -> `keywords`
- `ENDERECO` and URLs -> only if ORCID accepts the data cleanly
- `PRODUCAO-BIBLIOGRAFICA` -> `works`

## Output Standard

- Return the target ORCID section.
- Return the confidence level.
- Return any manual action required.
- Return the provenance needed for updates and put-code reuse.

