import type { LattesAuthor } from "@/lib/lattes/types";

export type XmlNode = Document | Element;

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

export function getChild(node: XmlNode | undefined, key: string): Element | undefined {
  if (!node) {
    return undefined;
  }

  const children = getChildElements(node);
  return children.find((child) => child.tagName === key);
}

export function getChildren(node: XmlNode | undefined, key: string): Element[] {
  if (!node) {
    return [];
  }

  return getChildElements(node).filter((child) => child.tagName === key);
}

export function getAttrs(node: Element | undefined): Record<string, string> {
  if (!node) {
    return {};
  }

  return Object.fromEntries(
    Array.from(node.attributes)
      .map((attr) => [attr.name, cleanValue(attr.value)] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

export function cleanValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const raw = typeof value === "string" ? value : String(value);
  const normalized = raw.replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function listKeywords(node: Element | undefined): string[] {
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

export function extractAuthors(nodes: Element[]): LattesAuthor[] {
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

function getChildElements(node: XmlNode): Element[] {
  if (node instanceof Document) {
    return node.documentElement ? [node.documentElement] : [];
  }

  return Array.from(node.children);
}
