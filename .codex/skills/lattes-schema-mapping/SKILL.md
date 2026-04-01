---
name: lattes-schema-mapping
description: Use when mapping Plataforma Lattes XML or XSD structures into normalized bibliographic domain objects, especially for PRODUCAO-BIBLIOGRAFICA, bibliographic attributes, author ordering, and legacy compatibility checks.
---

# Lattes Schema Mapping

Use this skill when the task depends on understanding the Lattes XML shape instead of guessing from sample files alone.

## Source Of Truth

- Primary schema: `assets/xml_cvbase_src_main_resources_CurriculoLattes.xsd`
- Private/raw sample: `source/0645206667083920.xml`
- Legacy references: `repos-legacy/*.zip`

## Workflow

1. Confirm whether the target data lives under `PRODUCAO-BIBLIOGRAFICA`.
2. Read the XSD branch for the exact production type before writing mapping logic.
3. Extract attributes from `DADOS-BASICOS-*`, `DETALHAMENTO-*`, and repeated `AUTORES` nodes.
4. Preserve author order from `ORDEM-DE-AUTORIA`.
5. Treat non-bibliographic branches as out of scope unless they improve citation metadata.

## Bibliographic Branches

- `TRABALHO-EM-EVENTOS`
- `ARTIGO-PUBLICADO`
- `ARTIGO-ACEITO-PARA-PUBLICACAO`
- `LIVRO-PUBLICADO-OU-ORGANIZADO`
- `CAPITULO-DE-LIVRO-PUBLICADO`
- `TEXTO-EM-JORNAL-OU-REVISTA`
- `OUTRA-PRODUCAO-BIBLIOGRAFICA`
- `PARTITURA-MUSICAL`
- `PREFACIO-POSFACIO`
- `TRADUCAO`

## Guardrails

- Prefer schema-backed mapping over heuristics inferred from one curriculum.
- Keep unmapped source attributes attached as provenance metadata instead of discarding them silently.
- When a branch has no clean BibTeX equivalent, map it to `@misc` and preserve the Lattes subtype in notes or keywords.
