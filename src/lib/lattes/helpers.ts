import he from "he";
import type { LattesAuthor } from "@/lib/lattes/types";

export interface XmlNode {
  $?: Record<string, unknown>;
  [key: string]: unknown;
}

const BIBTEX_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
] as const;

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function asNode(value: unknown): XmlNode | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as XmlNode;
}

export function getChild(node: XmlNode | undefined, key: string): XmlNode | undefined {
  return asNode(node?.[key]);
}

export function getChildren(
  node: XmlNode | undefined,
  key: string
): XmlNode[] {
  return asArray(node?.[key]).map((entry) => asNode(entry)).filter(Boolean) as XmlNode[];
}

export function getAttrs(node: XmlNode | undefined): Record<string, string> {
  const attrs = node?.$ ?? {};
  return Object.fromEntries(
    Object.entries(attrs)
      .map(([key, value]) => [key, cleanValue(value)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

export function cleanValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const raw = typeof value === "string" ? value : String(value);
  const decoded = he.decode(raw)
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decoded.length > 0 ? decoded : undefined;
}

export function listKeywords(node: XmlNode | undefined): string[] {
  const attrs = getAttrs(node);
  return Object.entries(attrs)
    .filter(([key]) => key.startsWith("PALAVRA-CHAVE"))
    .map(([, value]) => value)
    .filter(Boolean);
}

export function buildPages(start?: string, end?: string): string | undefined {
  if (start && end) {
    return `${start}--${end}`;
  }

  return start ?? end;
}

export function extractAuthors(nodes: XmlNode[]): LattesAuthor[] {
  return nodes
    .map((node, index) => {
      const attrs = getAttrs(node);
      const fullName =
        attrs["NOME-COMPLETO-DO-AUTOR"] ??
        attrs["NOME-COMPLETO-DO-PARTICIPANTE-DE-EVENTOS-CONGRESSOS"] ??
        attrs["NOME-COMPLETO-DO-PARTICIPANTE-DA-BANCA"];
      const citationName =
        attrs["NOME-PARA-CITACAO"] ??
        attrs["NOME-PARA-CITACAO-DO-PARTICIPANTE-DE-EVENTOS-CONGRESSOS"] ??
        attrs["NOME-PARA-CITACAO-DO-PARTICIPANTE-DA-BANCA"];
      const order =
        parseNumeric(attrs["ORDEM-DE-AUTORIA"]) ??
        parseNumeric(attrs["ORDEM-PARTICIPANTE"]) ??
        index + 1;

      if (!fullName && !citationName) {
        return undefined;
      }

      return {
        fullName: fullName ?? citationName ?? "Autor desconhecido",
        citationName,
        order
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left?.order ?? 999) - (right?.order ?? 999)) as LattesAuthor[];
}

export function parseNumeric(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toBibTeXAuthor(author: LattesAuthor): string {
  if (!author.citationName) {
    return author.fullName;
  }

  const [familyHint] = author.citationName.split(",");
  if (!familyHint) {
    return author.fullName;
  }

  const fullTokens = author.fullName.trim().split(/\s+/);
  const familyTokens = familyHint
    .trim()
    .split(/\s+/)
    .map((token) =>
      token
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    );

  const normalizedFullTokens = fullTokens.map((token) =>
    token
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  );

  const suffix = normalizedFullTokens.slice(-familyTokens.length);
  if (
    suffix.length === familyTokens.length &&
    suffix.every((token, index) => token === familyTokens[index])
  ) {
    const family = fullTokens.slice(-familyTokens.length).join(" ");
    const given = fullTokens.slice(0, -familyTokens.length).join(" ");
    return given ? `${family}, ${given}` : family;
  }

  return author.citationName;
}

export function parseLattesDate(value?: string): {
  year?: string;
  month?: string;
  day?: string;
  iso?: string;
} {
  if (!value) {
    return {};
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const monthIndex = Number(digits.slice(2, 4));
    const year = digits.slice(4, 8);

    return {
      year,
      month: BIBTEX_MONTHS[Math.max(0, Math.min(11, monthIndex - 1))],
      day,
      iso: `${year}-${digits.slice(2, 4)}-${day}`
    };
  }

  if (digits.length === 6) {
    const monthIndex = Number(digits.slice(0, 2));
    const year = digits.slice(2, 6);
    return {
      year,
      month: BIBTEX_MONTHS[Math.max(0, Math.min(11, monthIndex - 1))]
    };
  }

  if (digits.length === 4) {
    return { year: digits };
  }

  return {};
}

export function mergeNotes(...values: Array<string | undefined>): string[] {
  return values.filter(Boolean) as string[];
}
