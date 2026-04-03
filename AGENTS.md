# AGENTS

## Repository Agents

| Agent | Responsibility | Contact |
| --- | --- | --- |
| Product Steward | Own product scope, interoperability goals, public release criteria, and scientific workflow alignment with Lattes, ORCID, and WoS. | `TBD` |
| Parser Engineer | Maintain browser-side XML normalization, bibliographic extraction, BibTeX mapping, citekey generation, and client conversion contracts. | `TBD` |
| Privacy Steward | Keep fixtures sanitized, prevent raw file persistence, review offline processing guarantees, and enforce the no-cookie/no-backend policy. | `TBD` |
| UI Engineer | Maintain the React 18 + Vite application shell, accessibility, responsive layout, upload UX, and result-download flow. | `TBD` |
| Worker Engineer | Maintain the Web Worker conversion path, transferable buffer handling, same-thread fallback, and static-hosting compatibility. | `TBD` |
| QA and Release Steward | Maintain test coverage, manual ORCID verification workflow, static deploy readiness, and public-release checklist. | `TBD` |
| Codex Session Agent | Execute implementation, refactors, tests, and documentation updates against the repository rules captured here. | Current Codex session |

## Working Agreements

- Treat `assets/xml_cvbase_src_main_resources_CurriculoLattes.xsd` as the source of truth for bibliographic coverage.
- Keep `v1` focused on `Lattes XML -> BibTeX`.
- Never version unsanitized personal fixtures in the public repository history.
- Process XML and generate BibTeX locally in the browser whenever possible.
- Prefer small, typed, composable modules over one-pass conversion scripts.
- Preserve author order and import-relevant identifiers whenever present.

## Local Skills

- `lattes-schema-mapping`
- `bibtex-normalization`
- `fixture-sanitization`
- `xml-dom-browser-processing`
- `web-worker-file-conversion`

## Release Gates

- Sanitized real fixture exists and the private raw source is ignored.
- Every bibliographic branch under `PRODUCAO-BIBLIOGRAFICA` is covered by tests.
- Client conversion returns structured errors for malformed input and oversized uploads.
- Manual ORCID import validation has been recorded in project docs.
