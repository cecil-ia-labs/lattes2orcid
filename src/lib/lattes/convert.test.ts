// @vitest-environment jsdom

import { MAX_UPLOAD_SIZE_BYTES, convertLattesXmlBytes } from "@/lib/lattes/convert";
import { convertLattesXmlFile } from "@/lib/lattes/client";
import { handleWorkerConvertRequest } from "@/lib/lattes/worker-core";
import { sanitizeLattesXmlBytes } from "@/lib/lattes/sanitize";
import { readFixtureText } from "@/lib/test-utils/fixtures";

interface ParsedBibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

describe("convertLattesXmlBytes", () => {
  it("converts the sanitized real fixture and emits reparsable BibTeX", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const result = await convertLattesXmlBytes(new TextEncoder().encode(xml), "sanitized-lattes.xml");
    const entries = parseBibTeX(result.bibtex);

    expect(result.filename).toBe("sanitized-lattes.bib");
    expect(result.summary.totalItems).toBeGreaterThan(20);
    expect(result.summary.categories["TRABALHO-EM-EVENTOS"]).toBe(1);
    expect(result.summary.categories["ARTIGO-ACEITO-PARA-PUBLICACAO"]).toBeGreaterThan(0);
    expect(entries.some((entry) => entry.type === "inproceedings")).toBe(true);
    expect(entries.some((entry) => entry.type === "article")).toBe(true);
    expect(entries.some((entry) => entry.type === "unpublished")).toBe(true);
  });

  it("covers books and chapters with book and incollection mappings", async () => {
    const xml = await readFixtureText("synthetic/books-and-chapter.xml");
    const result = await convertLattesXmlBytes(new TextEncoder().encode(xml), "books-and-chapter.xml");
    const entries = parseBibTeX(result.bibtex);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.type).sort()).toEqual(["book", "incollection"]);
    expect(entries.find((entry) => entry.type === "book")?.fields.isbn).toBe("9786500000001");
    expect(entries.find((entry) => entry.type === "incollection")?.fields.booktitle).toBe(
      "Manual de Estruturas"
    );
  });

  it("maps remaining bibliographic types to misc and preserves subtype notes", async () => {
    const xml = await readFixtureText("synthetic/misc-types.xml");
    const result = await convertLattesXmlBytes(new TextEncoder().encode(xml), "misc-types.xml");
    const entries = parseBibTeX(result.bibtex);

    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.type === "misc")).toBe(true);
    expect(result.summary.fallbackMiscItems).toBe(4);
    expect(result.bibtex).toContain("Tipo Lattes:");
  });

  it("handles latin1 input, resolves citekey collisions, and warns on duplicate identifiers", async () => {
    const xml = await readFixtureText("synthetic/collision.xml");
    const buffer = encodeLatin1(xml);
    const result = await convertLattesXmlBytes(buffer, "collision.xml");
    const entries = parseBibTeX(result.bibtex);
    const warningCodes = result.warnings.map((warning) => warning.code);

    expect(entries).toHaveLength(2);
    expect(result.bibtex).toContain("João e o mesmo título");
    expect(entries[0].key).not.toBe(entries[1].key);
    expect(warningCodes).toContain("citekey-collision");
    expect(warningCodes).toContain("duplicate-identifier");
  });
});

describe("convertLattesXmlFile", () => {
  it("falls back to the main thread when workers are unavailable", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const file = createFileLike(xml, "sanitized-lattes.xml");
    const originalWorker = globalThis.Worker;

    try {
      // @ts-expect-error browser fallback test
      globalThis.Worker = undefined;
      const result = await convertLattesXmlFile(file);

      expect(result.filename).toBe("sanitized-lattes.bib");
      expect(result.summary.convertedItems).toBeGreaterThan(0);
    } finally {
      globalThis.Worker = originalWorker;
    }
  });

  it("uses the worker facade when a worker is available", async () => {
    const xml = await readFixtureText("synthetic/books-and-chapter.xml");
    const file = createFileLike(xml, "books-and-chapter.xml");
    const expected = await convertLattesXmlBytes(new TextEncoder().encode(xml), "books-and-chapter.xml");
    const originalWorker = globalThis.Worker;
    const transfers: ArrayBuffer[] = [];

    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      private messageListener: ((event: MessageEvent) => void) | null = null;
      private errorListener: ((event: Event) => void) | null = null;

      constructor() {}

      addEventListener(type: string, listener: EventListener) {
        if (type === "message") {
          this.messageListener = listener as (event: MessageEvent) => void;
        }

        if (type === "error") {
          this.errorListener = listener as (event: Event) => void;
        }
      }

      removeEventListener(type: string) {
        if (type === "message") {
          this.messageListener = null;
        }

        if (type === "error") {
          this.errorListener = null;
        }
      }

      terminate() {}

      postMessage(message: { buffer: ArrayBuffer }, transferList: ArrayBuffer[]) {
        transfers.push(...transferList);
        queueMicrotask(() => {
          this.messageListener?.({
            data: {
              type: "success",
              payload: expected
            }
          } as MessageEvent);
        });
        expect(message.buffer).toBeInstanceOf(ArrayBuffer);
      }
    }

    try {
      // @ts-expect-error browser worker mock
      globalThis.Worker = MockWorker;
      const result = await convertLattesXmlFile(file);

      expect(result.filename).toBe("books-and-chapter.bib");
      expect(result.summary.convertedItems).toBe(expected.summary.convertedItems);
      expect(transfers).toHaveLength(1);
    } finally {
      globalThis.Worker = originalWorker;
    }
  });

  it("falls back to the main thread when the worker crashes at runtime", async () => {
    const xml = await readFixtureText("synthetic/books-and-chapter.xml");
    const file = createFileLike(xml, "books-and-chapter.xml");
    const originalWorker = globalThis.Worker;

    class FailingWorker {
      private errorListener: ((event: Event) => void) | null = null;

      constructor() {}

      addEventListener(type: string, listener: EventListener) {
        if (type === "error") {
          this.errorListener = listener as (event: Event) => void;
        }
      }

      removeEventListener() {}

      terminate() {}

      postMessage() {
        queueMicrotask(() => {
          this.errorListener?.(new Event("error"));
        });
      }
    }

    try {
      // @ts-expect-error browser worker mock
      globalThis.Worker = FailingWorker;
      const result = await convertLattesXmlFile(file);

      expect(result.filename).toBe("books-and-chapter.bib");
      expect(result.summary.convertedItems).toBeGreaterThan(0);
    } finally {
      globalThis.Worker = originalWorker;
    }
  });

  it("falls back to the main thread when the worker returns an internal error payload", async () => {
    const xml = await readFixtureText("synthetic/books-and-chapter.xml");
    const file = createFileLike(xml, "books-and-chapter.xml");
    const originalWorker = globalThis.Worker;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    class InternalErrorWorker {
      private messageListener: ((event: MessageEvent) => void) | null = null;

      constructor() {}

      addEventListener(type: string, listener: EventListener) {
        if (type === "message") {
          this.messageListener = listener as (event: MessageEvent) => void;
        }
      }

      removeEventListener() {}

      terminate() {}

      postMessage() {
        queueMicrotask(() => {
          this.messageListener?.({
            data: {
              type: "error",
              error: {
                code: "worker_internal_error",
                message: "Falha interna durante a conversão do arquivo."
              }
            }
          } as MessageEvent);
        });
      }
    }

    try {
      // @ts-expect-error browser worker mock
      globalThis.Worker = InternalErrorWorker;
      const result = await convertLattesXmlFile(file);

      expect(result.filename).toBe("books-and-chapter.bib");
      expect(result.summary.convertedItems).toBeGreaterThan(0);
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      globalThis.Worker = originalWorker;
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("rejects invalid XML payloads", async () => {
    const file = createFileLike("<not-closed", "broken.xml");

    await expect(convertLattesXmlFile(file)).rejects.toMatchObject({
      code: "invalid_xml"
    });
  });

  it("rejects XML files without CURRICULO-VITAE as the root element", async () => {
    const file = createFileLike(
      '<?xml version="1.0" encoding="UTF-8"?><OUTRO-ELEMENTO />',
      "wrong-root.xml"
    );

    await expect(convertLattesXmlFile(file)).rejects.toMatchObject({
      code: "invalid_root_element"
    });
  });

  it("rejects curricula without bibliographic content", async () => {
    const file = createFileLike(
      `<?xml version="1.0" encoding="UTF-8"?>
<CURRICULO-VITAE>
  <DADOS-GERAIS NOME-COMPLETO="Pesquisador Exemplo" />
 </CURRICULO-VITAE>`,
      "empty-bibliography.xml"
    );

    await expect(convertLattesXmlFile(file)).rejects.toMatchObject({
      code: "missing_bibliographic_content"
    });
  });

  it("rejects oversized uploads", async () => {
    const file = createFileLike("<xml />", "big.xml", MAX_UPLOAD_SIZE_BYTES + 1);

    await expect(convertLattesXmlFile(file)).rejects.toMatchObject({
      code: "file_too_large"
    });
  });
});

describe("handleWorkerConvertRequest", () => {
  it("returns a worker success payload for valid XML", async () => {
    const xml = await readFixtureText("synthetic/books-and-chapter.xml");
    const response = await handleWorkerConvertRequest({
      type: "convert",
      fileName: "books-and-chapter.xml",
      buffer: new TextEncoder().encode(xml).buffer
    });

    expect(response.type).toBe("success");
    if (response.type === "success") {
      expect(response.payload.filename).toBe("books-and-chapter.bib");
    }
  });

  it("returns a worker error payload for invalid XML", async () => {
    const response = await handleWorkerConvertRequest({
      type: "convert",
      fileName: "broken.xml",
      buffer: new TextEncoder().encode("<not-closed").buffer
    });

    expect(response.type).toBe("error");
    if (response.type === "error") {
      expect(response.error.code).toBe("invalid_xml");
    }
  });
});

describe("sanitizeLattesXmlBytes", () => {
  it("removes direct identifiers from a raw XML sample", () => {
    const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<CURRICULO-VITAE>
  <DADOS-GERAIS
    NOME-COMPLETO="João da Silva"
    NOME-EM-CITACOES-BIBLIOGRAFICAS="SILVA, J.;JOÃO DA SILVA"
    CPF="03403635929"
    E-MAIL="juninhodeluca@gmail.com"
    TELEFONE-CELULAR="48999999999"
    HOME-PAGE="https://example.com/perfil"
  />
</CURRICULO-VITAE>`;

    const sanitized = sanitizeLattesXmlBytes(new TextEncoder().encode(rawXml));

    expect(sanitized).not.toContain("03403635929");
    expect(sanitized).not.toContain("juninhodeluca@gmail.com");
    expect(sanitized).not.toContain("João da Silva");
    expect(sanitized).toContain("privado@example.test");
    expect(sanitized).toContain("Pesquisador Exemplo");
    expect(sanitized).toContain("00000000000");
    expect(sanitized).toContain("https://example.test");
  });
});

function parseBibTeX(input: string): ParsedBibTeXEntry[] {
  const entries: ParsedBibTeXEntry[] = [];
  const entryPattern = /@([a-z]+)\{([^,]+),\n([\s\S]*?)\n\}/gi;

  for (const match of input.matchAll(entryPattern)) {
    const [, type, key, body] = match;
    const fields: Record<string, string> = {};

    for (const line of body.split("\n")) {
      const fieldMatch = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*\{([\s\S]*)\},?$/);
      if (!fieldMatch) {
        continue;
      }

      fields[fieldMatch[1]] = fieldMatch[2];
    }

    entries.push({ type, key, fields });
  }

  return entries;
}

function encodeLatin1(text: string): Uint8Array {
  return Uint8Array.from(Array.from(text, (character) => character.charCodeAt(0)));
}

function createFileLike(
  xml: string,
  name: string,
  sizeOverride?: number
): File {
  const bytes = new TextEncoder().encode(xml);
  return {
    name,
    size: sizeOverride ?? bytes.byteLength,
    type: "application/xml",
    arrayBuffer: async () => bytes.buffer.slice(0)
  } as File;
}
