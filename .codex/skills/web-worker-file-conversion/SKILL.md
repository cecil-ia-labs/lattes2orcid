---
name: web-worker-file-conversion
description: Use when moving file conversion work off the main thread with browser Web Workers, transferable ArrayBuffers, typed request-response messages, graceful fallback, and static-hosted app constraints.
---

# Web Worker File Conversion

Use this skill when XML-to-BibTeX conversion should run in the browser without blocking the UI.

## Goal

Run heavy conversion work in a module `Web Worker` and keep the UI limited to file selection, progress state, results, and download.

## Worker Contract

- Request: `{ type: "convert", fileName, buffer }`
- Success: `{ type: "success", payload }`
- Error: `{ type: "error", error }`

## Rules

- Transfer `ArrayBuffer` ownership to the worker.
- Keep worker messages fully typed.
- Hide worker orchestration behind one browser-facing client facade.
- Add a same-thread fallback for startup or capability failure.
- Never make the UI know whether the worker or fallback path produced the result.

## Static Hosting Constraints

- Assume no backend.
- Assume GitHub Pages deployment.
- Use module workers that bundle cleanly with Vite.
- Avoid APIs that need a server or custom headers.

## Error Handling

- Convert worker failures into the same user-facing error model used by the app.
- Preserve validation messages for invalid XML, wrong root, missing bibliography, and file size violations.
