import {
  parseLattesDate,
  toBibTeXAuthor,
  toSlug
} from "@/lib/lattes/helpers";
import type {
  BibTeXEntry,
  ConversionWarning,
  LattesBibliographicItem
} from "@/lib/lattes/types";

export function mapToBibTeXEntries(items: LattesBibliographicItem[]): {
  entries: BibTeXEntry[];
  warnings: ConversionWarning[];
} {
  const warnings: ConversionWarning[] = [];
  const citeKeyCount = new Map<string, number>();
  const identifierOwners = new Map<string, string>();

  const entries = items.map((item) => {
    const fields = buildBaseFields(item);
    const citeKey = createCiteKey(item, citeKeyCount, warnings);
    const entryType = resolveEntryType(item.sourceType);

    switch (item.sourceType) {
      case "TRABALHO-EM-EVENTOS":
        setIfPresent(fields, "booktitle", item.containerTitle ?? item.eventName);
        setIfPresent(fields, "eventtitle", item.eventName);
        setIfPresent(fields, "publisher", item.publisher);
        setIfPresent(fields, "address", item.place);
        setIfPresent(fields, "isbn", item.isbn);
        break;
      case "ARTIGO-PUBLICADO":
        setIfPresent(fields, "journal", item.containerTitle);
        setIfPresent(fields, "issn", item.issn);
        setIfPresent(fields, "address", item.place);
        break;
      case "ARTIGO-ACEITO-PARA-PUBLICACAO":
        setIfPresent(fields, "journal", item.containerTitle);
        setIfPresent(fields, "issn", item.issn);
        prependNote(fields, "Registro aceito para publicação.");
        break;
      case "LIVRO-PUBLICADO-OU-ORGANIZADO":
        setIfPresent(fields, "publisher", item.publisher);
        setIfPresent(fields, "address", item.place);
        setIfPresent(fields, "isbn", item.isbn);
        setIfPresent(fields, "edition", item.edition);
        setIfPresent(fields, "series", item.series);
        setIfPresent(fields, "volume", item.volume);
        setIfPresent(fields, "pagetotal", item.pageCount);
        break;
      case "CAPITULO-DE-LIVRO-PUBLICADO":
        setIfPresent(fields, "booktitle", item.containerTitle);
        setIfPresent(fields, "publisher", item.publisher);
        setIfPresent(fields, "address", item.place);
        setIfPresent(fields, "isbn", item.isbn);
        setIfPresent(fields, "edition", item.edition);
        setIfPresent(fields, "series", item.series);
        setIfPresent(fields, "editor", item.editor);
        break;
      case "TEXTO-EM-JORNAL-OU-REVISTA":
        setIfPresent(fields, "journal", item.containerTitle);
        setIfPresent(fields, "issn", item.issn);
        setIfPresent(fields, "address", item.place);
        break;
      default:
        setIfPresent(fields, "howpublished", item.medium);
        setIfPresent(fields, "publisher", item.publisher);
        setIfPresent(fields, "address", item.place);
        if (item.subtype) {
          prependNote(fields, `Tipo Lattes: ${item.subtype}.`);
        }
        break;
    }

    warnOnDuplicateIdentifier(item.doi, `doi:${item.doi}`, identifierOwners, citeKey, warnings);
    warnOnDuplicateIdentifier(item.isbn, `isbn:${item.isbn}`, identifierOwners, citeKey, warnings);
    warnOnDuplicateIdentifier(item.issn, `issn:${item.issn}`, identifierOwners, citeKey, warnings);

    return {
      entryType,
      citeKey,
      fields,
      sourceType: item.sourceType,
      sequence: item.sequence
    } satisfies BibTeXEntry;
  });

  return { entries, warnings };
}

function buildBaseFields(item: LattesBibliographicItem): Record<string, string> {
  const fields: Record<string, string> = {};
  const author = item.authors.map(toBibTeXAuthor).join(" and ");
  const parsedDate = parseLattesDate(item.publicationDate ?? item.year);

  setIfPresent(fields, "author", author);
  setIfPresent(fields, "title", item.title);
  setIfPresent(fields, "year", parsedDate.year ?? item.year);
  setIfPresent(fields, "month", parsedDate.month);
  setIfPresent(fields, "day", parsedDate.day);
  setIfPresent(fields, "language", item.language);
  setIfPresent(fields, "volume", item.volume);
  setIfPresent(fields, "number", item.number);
  setIfPresent(fields, "pages", item.pages);
  setIfPresent(fields, "doi", item.doi);
  setIfPresent(fields, "url", item.url);
  setIfPresent(fields, "series", item.series);
  setIfPresent(fields, "keywords", item.keywords.join(", "));

  if (item.notes.length > 0) {
    fields.note = item.notes.join(" | ");
  }

  if (item.publicationDate && parsedDate.iso) {
    prependNote(fields, `Data Lattes: ${parsedDate.iso}.`);
  }

  return fields;
}

function resolveEntryType(sourceType: LattesBibliographicItem["sourceType"]) {
  switch (sourceType) {
    case "TRABALHO-EM-EVENTOS":
      return "inproceedings";
    case "ARTIGO-PUBLICADO":
    case "TEXTO-EM-JORNAL-OU-REVISTA":
      return "article";
    case "ARTIGO-ACEITO-PARA-PUBLICACAO":
      return "unpublished";
    case "LIVRO-PUBLICADO-OU-ORGANIZADO":
      return "book";
    case "CAPITULO-DE-LIVRO-PUBLICADO":
      return "incollection";
    default:
      return "misc";
  }
}

function createCiteKey(
  item: LattesBibliographicItem,
  counters: Map<string, number>,
  warnings: ConversionWarning[]
): string {
  const year = item.year ?? "undated";
  const primaryAuthor = item.authors[0];
  const surnameSource = primaryAuthor?.citationName?.split(",")[0] ?? primaryAuthor?.fullName ?? "anon";
  const surname = toSlug(surnameSource.split(/\s+/).slice(-1)[0] ?? "anon");
  const titleFragment = toSlug(item.title).split("-").slice(0, 4).join("-");
  const baseKey = [year, surname || "anon", titleFragment || "sem-titulo"]
    .filter(Boolean)
    .join("-");
  const count = counters.get(baseKey) ?? 0;

  if (count > 0) {
    warnings.push({
      code: "citekey-collision",
      message: `Colisão de citekey resolvida para ${baseKey}.`,
      sourceType: item.sourceType,
      sequence: item.sequence
    });
  }

  counters.set(baseKey, count + 1);
  return count === 0 ? baseKey : `${baseKey}-${count + 1}`;
}

function warnOnDuplicateIdentifier(
  identifier: string | undefined,
  key: string,
  owners: Map<string, string>,
  citeKey: string,
  warnings: ConversionWarning[]
) {
  if (!identifier) {
    return;
  }

  const previousOwner = owners.get(key);
  if (previousOwner) {
    warnings.push({
      code: "duplicate-identifier",
      message: `O identificador ${identifier} aparece em mais de um registro (${previousOwner} e ${citeKey}).`
    });
    return;
  }

  owners.set(key, citeKey);
}

function setIfPresent(
  fields: Record<string, string>,
  key: string,
  value: string | undefined
) {
  if (value) {
    fields[key] = value;
  }
}

function prependNote(fields: Record<string, string>, note: string) {
  fields.note = fields.note ? `${note} ${fields.note}` : note;
}
