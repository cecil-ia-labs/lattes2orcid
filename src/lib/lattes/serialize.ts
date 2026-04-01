import type { BibTeXEntry } from "@/lib/lattes/types";

const FIELD_PRIORITY = [
  "author",
  "title",
  "booktitle",
  "journal",
  "editor",
  "year",
  "month",
  "day",
  "volume",
  "number",
  "pages",
  "publisher",
  "address",
  "edition",
  "series",
  "language",
  "doi",
  "isbn",
  "issn",
  "url",
  "keywords",
  "note",
  "howpublished",
  "pagetotal",
  "eventtitle"
] as const;

export function serializeBibTeX(entries: BibTeXEntry[]): string {
  return entries.map(serializeEntry).join("\n\n");
}

function serializeEntry(entry: BibTeXEntry): string {
  const keys = Object.keys(entry.fields);
  const orderedKeys = [
    ...FIELD_PRIORITY.filter((field) => keys.includes(field)),
    ...keys
      .filter((field) => !FIELD_PRIORITY.includes(field as (typeof FIELD_PRIORITY)[number]))
      .sort((left, right) => left.localeCompare(right))
  ];

  const body = orderedKeys
    .map((field) => `  ${field} = {${escapeBibTeX(entry.fields[field])}}`)
    .join(",\n");

  return `@${entry.entryType}{${entry.citeKey},\n${body}\n}`;
}

function escapeBibTeX(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[{}]/g, "\\$&");
}
