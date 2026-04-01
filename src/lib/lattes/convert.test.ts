// @vitest-environment node

import bibtexParse from "bibtex-parse";
import { convertLattesXmlBuffer } from "@/lib/lattes/convert";
import { sanitizeLattesXmlBuffer } from "@/lib/lattes/sanitize";
import { readFixtureBuffer, readFixtureText } from "@/lib/test-utils/fixtures";
import type { ParsedBibTeXEntry } from "bibtex-parse";

describe("convertLattesXmlBuffer", () => {
  it("converts the sanitized real fixture and emits reparsable BibTeX", async () => {
    const buffer = await readFixtureBuffer("real/sanitized-lattes.xml");
    const result = await convertLattesXmlBuffer(buffer, "sanitized-lattes.xml");
    const entries = bibtexParse.entries(result.bibtex);

    expect(result.filename).toBe("sanitized-lattes.bib");
    expect(result.summary.totalItems).toBeGreaterThan(20);
    expect(result.summary.categories["TRABALHO-EM-EVENTOS"]).toBe(1);
    expect(result.summary.categories["ARTIGO-ACEITO-PARA-PUBLICACAO"]).toBeGreaterThan(0);
    expect(entries.some((entry: ParsedBibTeXEntry) => entry.type === "inproceedings")).toBe(true);
    expect(entries.some((entry: ParsedBibTeXEntry) => entry.type === "article")).toBe(true);
    expect(entries.some((entry: ParsedBibTeXEntry) => entry.type === "unpublished")).toBe(true);
  });

  it("covers books and chapters with book and incollection mappings", async () => {
    const buffer = await readFixtureBuffer("synthetic/books-and-chapter.xml");
    const result = await convertLattesXmlBuffer(buffer, "books-and-chapter.xml");
    const entries = bibtexParse.entries(result.bibtex);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry: ParsedBibTeXEntry) => entry.type).sort()).toEqual([
      "book",
      "incollection"
    ]);
    expect(entries.find((entry: ParsedBibTeXEntry) => entry.type === "book")?.ISBN).toBe(
      "9786500000001"
    );
    expect(
      entries.find((entry: ParsedBibTeXEntry) => entry.type === "incollection")?.BOOKTITLE
    ).toBe(
      "Manual de Estruturas"
    );
  });

  it("maps remaining bibliographic types to misc and preserves subtype notes", async () => {
    const buffer = await readFixtureBuffer("synthetic/misc-types.xml");
    const result = await convertLattesXmlBuffer(buffer, "misc-types.xml");
    const entries = bibtexParse.entries(result.bibtex);

    expect(entries).toHaveLength(4);
    expect(entries.every((entry: ParsedBibTeXEntry) => entry.type === "misc")).toBe(true);
    expect(result.summary.fallbackMiscItems).toBe(4);
    expect(result.bibtex).toContain("Tipo Lattes:");
  });

  it("handles latin1 input, resolves citekey collisions, and warns on duplicate identifiers", async () => {
    const xml = await readFixtureText("synthetic/collision.xml");
    const buffer = Buffer.from(xml, "latin1");
    const result = await convertLattesXmlBuffer(buffer, "collision.xml");
    const entries = bibtexParse.entries(result.bibtex);
    const warningCodes = result.warnings.map((warning) => warning.code);

    expect(entries).toHaveLength(2);
    expect(result.bibtex).toContain("João e o mesmo título");
    expect(entries[0].key).not.toBe(entries[1].key);
    expect(warningCodes).toContain("citekey-collision");
    expect(warningCodes).toContain("duplicate-identifier");
  });
});

describe("sanitizeLattesXmlBuffer", () => {
  it("removes direct identifiers from the private raw fixture", async () => {
    const rawBuffer = await readFixtureBuffer("../../source/0645206667083920.xml");
    const sanitized = await sanitizeLattesXmlBuffer(rawBuffer);

    expect(sanitized).not.toContain("03403635929");
    expect(sanitized).not.toContain("juninhodeluca@gmail.com");
    expect(sanitized).toContain("privado@example.test");
    expect(sanitized).toContain("Pesquisador Exemplo");
  });
});
