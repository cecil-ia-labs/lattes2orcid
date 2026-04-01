export type LattesSourceType =
  | "TRABALHO-EM-EVENTOS"
  | "ARTIGO-PUBLICADO"
  | "ARTIGO-ACEITO-PARA-PUBLICACAO"
  | "LIVRO-PUBLICADO-OU-ORGANIZADO"
  | "CAPITULO-DE-LIVRO-PUBLICADO"
  | "TEXTO-EM-JORNAL-OU-REVISTA"
  | "OUTRA-PRODUCAO-BIBLIOGRAFICA"
  | "PARTITURA-MUSICAL"
  | "PREFACIO-POSFACIO"
  | "TRADUCAO";

export interface LattesAuthor {
  fullName: string;
  citationName?: string;
  order?: number;
}

export interface ConversionWarning {
  code: string;
  message: string;
  sourceType?: LattesSourceType;
  sequence?: string;
}

export interface ConversionSummary {
  totalItems: number;
  convertedItems: number;
  skippedItems: number;
  fallbackMiscItems: number;
  categories: Record<string, number>;
}

export interface LattesBaseItem {
  sourceType: LattesSourceType;
  sequence?: string;
  subtype?: string;
  title: string;
  titleEnglish?: string;
  year?: string;
  publicationDate?: string;
  country?: string;
  language?: string;
  medium?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  issn?: string;
  volume?: string;
  number?: string;
  series?: string;
  pages?: string;
  publisher?: string;
  place?: string;
  authors: LattesAuthor[];
  keywords: string[];
  notes: string[];
  containerTitle?: string;
  eventName?: string;
  editor?: string;
  rawContext: Record<string, string>;
}

export interface WorkInEventsItem extends LattesBaseItem {
  sourceType: "TRABALHO-EM-EVENTOS";
}

export interface PublishedArticleItem extends LattesBaseItem {
  sourceType: "ARTIGO-PUBLICADO";
}

export interface AcceptedArticleItem extends LattesBaseItem {
  sourceType: "ARTIGO-ACEITO-PARA-PUBLICACAO";
}

export interface BookItem extends LattesBaseItem {
  sourceType: "LIVRO-PUBLICADO-OU-ORGANIZADO";
  edition?: string;
  pageCount?: string;
}

export interface BookChapterItem extends LattesBaseItem {
  sourceType: "CAPITULO-DE-LIVRO-PUBLICADO";
  edition?: string;
}

export interface JournalTextItem extends LattesBaseItem {
  sourceType: "TEXTO-EM-JORNAL-OU-REVISTA";
}

export interface MiscBibliographicItem extends LattesBaseItem {
  sourceType:
    | "OUTRA-PRODUCAO-BIBLIOGRAFICA"
    | "PARTITURA-MUSICAL"
    | "PREFACIO-POSFACIO"
    | "TRADUCAO";
}

export type LattesBibliographicItem =
  | WorkInEventsItem
  | PublishedArticleItem
  | AcceptedArticleItem
  | BookItem
  | BookChapterItem
  | JournalTextItem
  | MiscBibliographicItem;

export type BibTeXEntryType =
  | "article"
  | "inproceedings"
  | "book"
  | "incollection"
  | "unpublished"
  | "misc";

export interface BibTeXEntry {
  entryType: BibTeXEntryType;
  citeKey: string;
  fields: Record<string, string>;
  sourceType: LattesSourceType;
  sequence?: string;
}

export interface ConversionResponse {
  filename: string;
  bibtex: string;
  summary: ConversionSummary;
  warnings: ConversionWarning[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
