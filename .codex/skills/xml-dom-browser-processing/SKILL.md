---
name: xml-dom-browser-processing
description: Use when parsing Lattes XML in the browser with native DOM APIs, detecting encoding from raw bytes, traversing XML elements and attributes, handling parsererror nodes, and avoiding server-only XML libraries.
---

# XML DOM Browser Processing

Use this skill when the XML pipeline must run fully in the browser.

## Goal

Parse and traverse Lattes XML with browser-native APIs only:

- `File`
- `ArrayBuffer`
- `Uint8Array`
- `TextDecoder`
- `DOMParser`

## Rules

- Prefer `TextDecoder` over Node `Buffer`.
- Parse XML with `DOMParser`, not `xml2js`.
- Detect invalid XML by checking for `parsererror` in the parsed document.
- Read attributes directly from `Element`.
- Preserve the current mapping rules from the XSD-backed pipeline.
- Keep helpers small and deterministic.

## DOM Traversal

- Use exact tag names from the Lattes schema.
- Preserve author order from `ORDEM-DE-AUTORIA`.
- Read repeated nodes with direct child iteration or targeted selectors.
- Normalize whitespace and entities in one dedicated helper layer.

## Encoding

- Inspect the XML declaration first.
- Support at least `utf-8` and `iso-8859-1`/`latin1`.
- Convert raw bytes to text before parsing.

## Guardrails

- Do not depend on backend parsers.
- Do not silently swallow malformed XML.
- Keep browser parsing logic reusable from both worker and main-thread fallback paths.
