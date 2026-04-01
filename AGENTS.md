# AGENTS

## Repository Agents

| Agent | Responsibility | Contact |
| --- | --- | --- |
| Product Steward | Own product scope, interoperability goals, public release criteria, and scientific workflow alignment with Lattes, ORCID, and WoS. | `TBD` |
| Parser Engineer | Maintain the XML normalization, bibliographic extraction, BibTeX mapping, citekey generation, and API contract. | `TBD` |
| Privacy Steward | Keep fixtures sanitized, prevent raw upload persistence, review logging and retention behavior, and enforce the no-cookie/no-database policy. | `TBD` |
| UI Engineer | Maintain the Next.js application shell, accessibility, responsive layout, upload UX, and result-download flow. | `TBD` |
| QA and Release Steward | Maintain test coverage, manual ORCID verification workflow, deploy readiness, and public-release checklist. | `TBD` |
| Codex Session Agent | Execute implementation, refactors, tests, and documentation updates against the repository rules captured here. | Current Codex session |

## Working Agreements

- Treat `assets/xml_cvbase_src_main_resources_CurriculoLattes.xsd` as the source of truth for bibliographic coverage.
- Keep `v1` focused on `Lattes XML -> BibTeX`.
- Never version unsanitized personal fixtures in the public repository history.
- Do not persist uploaded XML or generated BibTeX on the server.
- Prefer small, typed, composable modules over one-pass conversion scripts.
- Preserve author order and import-relevant identifiers whenever present.

## Release Gates

- Sanitized real fixture exists and the private raw source is ignored.
- Every bibliographic branch under `PRODUCAO-BIBLIOGRAFICA` is covered by tests.
- API returns structured `4xx` errors for malformed input and oversized uploads.
- Manual ORCID import validation has been recorded in project docs.
