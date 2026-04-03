import {
  buildPages,
  cleanValue,
  extractAuthors,
  getAttrs,
  getChild,
  getChildren,
  listKeywords,
  mergeNotes
} from "@/lib/lattes/helpers";
import type {
  ConversionWarning,
  LattesBaseItem,
  LattesBibliographicItem,
  LattesSourceType,
  MiscBibliographicItem
} from "@/lib/lattes/types";
import type { XmlNode } from "@/lib/lattes/helpers";

interface ExtractionConfig {
  sourceType: LattesSourceType;
  basicKey: string;
  detailKey: string;
  basic: {
    title: string;
    titleEnglish?: string;
    year?: string;
    country?: string;
    language?: string;
    medium?: string;
    url?: string;
    doi?: string;
    subtype?: string;
    secondarySubtype?: string;
  };
  detail?: {
    containerTitle?: string;
    eventName?: string;
    volume?: string;
    number?: string;
    series?: string;
    pages?: [string, string];
    publisher?: string;
    place?: string;
    isbn?: string;
    issn?: string;
    editor?: string;
    edition?: string;
    pageCount?: string;
    publicationDate?: string;
    extraNoteFields?: string[];
  };
  extraNotes?: (attrs: {
    basic: Record<string, string>;
    detail: Record<string, string>;
  }) => string[];
}

export function extractBibliographicItems(root: XmlNode): {
  items: LattesBibliographicItem[];
  warnings: ConversionWarning[];
} {
  const warnings: ConversionWarning[] = [];
  const curriculum = getChild(root, "CURRICULO-VITAE");
  const production = getChild(curriculum, "PRODUCAO-BIBLIOGRAFICA");

  if (!production) {
    return { items: [], warnings };
  }

  const items: LattesBibliographicItem[] = [];

  items.push(
    ...extractWithConfig(
      getChildren(getChild(production, "TRABALHOS-EM-EVENTOS"), "TRABALHO-EM-EVENTOS"),
      {
        sourceType: "TRABALHO-EM-EVENTOS",
        basicKey: "DADOS-BASICOS-DO-TRABALHO",
        detailKey: "DETALHAMENTO-DO-TRABALHO",
        basic: {
          title: "TITULO-DO-TRABALHO",
          titleEnglish: "TITULO-DO-TRABALHO-INGLES",
          year: "ANO-DO-TRABALHO",
          country: "PAIS-DO-EVENTO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DOS-ANAIS-OU-PROCEEDINGS",
          eventName: "NOME-DO-EVENTO",
          volume: "VOLUME",
          number: "FASCICULO",
          series: "SERIE",
          pages: ["PAGINA-INICIAL", "PAGINA-FINAL"],
          publisher: "NOME-DA-EDITORA",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISBN"
        }
      },
      warnings
    )
  );

  items.push(
    ...extractWithConfig(
      getChildren(getChild(production, "ARTIGOS-PUBLICADOS"), "ARTIGO-PUBLICADO"),
      {
        sourceType: "ARTIGO-PUBLICADO",
        basicKey: "DADOS-BASICOS-DO-ARTIGO",
        detailKey: "DETALHAMENTO-DO-ARTIGO",
        basic: {
          title: "TITULO-DO-ARTIGO",
          titleEnglish: "TITULO-DO-ARTIGO-INGLES",
          year: "ANO-DO-ARTIGO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DO-PERIODICO-OU-REVISTA",
          volume: "VOLUME",
          number: "FASCICULO",
          series: "SERIE",
          pages: ["PAGINA-INICIAL", "PAGINA-FINAL"],
          place: "LOCAL-DE-PUBLICACAO",
          issn: "ISSN"
        }
      },
      warnings
    )
  );

  items.push(
    ...extractWithConfig(
      getChildren(
        getChild(production, "ARTIGOS-ACEITOS-PARA-PUBLICACAO"),
        "ARTIGO-ACEITO-PARA-PUBLICACAO"
      ),
      {
        sourceType: "ARTIGO-ACEITO-PARA-PUBLICACAO",
        basicKey: "DADOS-BASICOS-DO-ARTIGO",
        detailKey: "DETALHAMENTO-DO-ARTIGO",
        basic: {
          title: "TITULO-DO-ARTIGO",
          titleEnglish: "TITULO-DO-ARTIGO-INGLES",
          year: "ANO-DO-ARTIGO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DO-PERIODICO-OU-REVISTA",
          volume: "VOLUME",
          number: "FASCICULO",
          series: "SERIE",
          pages: ["PAGINA-INICIAL", "PAGINA-FINAL"],
          place: "LOCAL-DE-PUBLICACAO",
          issn: "ISSN"
        },
        extraNotes: () => ["Registro marcado como aceito para publicação no Lattes."]
      },
      warnings
    )
  );

  const books = getChild(getChild(production, "LIVROS-E-CAPITULOS"), "LIVROS-PUBLICADOS-OU-ORGANIZADOS");
  items.push(
    ...extractWithConfig(
      getChildren(books, "LIVRO-PUBLICADO-OU-ORGANIZADO"),
      {
        sourceType: "LIVRO-PUBLICADO-OU-ORGANIZADO",
        basicKey: "DADOS-BASICOS-DO-LIVRO",
        detailKey: "DETALHAMENTO-DO-LIVRO",
        basic: {
          title: "TITULO-DO-LIVRO",
          titleEnglish: "TITULO-DO-LIVRO-INGLES",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "TIPO",
          secondarySubtype: "NATUREZA"
        },
        detail: {
          volume: "NUMERO-DE-VOLUMES",
          series: "NUMERO-DA-SERIE",
          publisher: "NOME-DA-EDITORA",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISBN",
          edition: "NUMERO-DA-EDICAO-REVISAO",
          pageCount: "NUMERO-DE-PAGINAS"
        }
      },
      warnings
    )
  );

  const chapters = getChild(getChild(production, "LIVROS-E-CAPITULOS"), "CAPITULOS-DE-LIVROS-PUBLICADOS");
  items.push(
    ...extractWithConfig(
      getChildren(chapters, "CAPITULO-DE-LIVRO-PUBLICADO"),
      {
        sourceType: "CAPITULO-DE-LIVRO-PUBLICADO",
        basicKey: "DADOS-BASICOS-DO-CAPITULO",
        detailKey: "DETALHAMENTO-DO-CAPITULO",
        basic: {
          title: "TITULO-DO-CAPITULO-DO-LIVRO",
          titleEnglish: "TITULO-DO-CAPITULO-DO-LIVRO-INGLES",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "TIPO"
        },
        detail: {
          containerTitle: "TITULO-DO-LIVRO",
          volume: "NUMERO-DE-VOLUMES",
          pages: ["PAGINA-INICIAL", "PAGINA-FINAL"],
          publisher: "NOME-DA-EDITORA",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISBN",
          edition: "NUMERO-DA-EDICAO-REVISAO",
          series: "NUMERO-DA-SERIE",
          editor: "ORGANIZADORES"
        }
      },
      warnings
    )
  );

  items.push(
    ...extractWithConfig(
      getChildren(
        getChild(production, "TEXTOS-EM-JORNAIS-OU-REVISTAS"),
        "TEXTO-EM-JORNAL-OU-REVISTA"
      ),
      {
        sourceType: "TEXTO-EM-JORNAL-OU-REVISTA",
        basicKey: "DADOS-BASICOS-DO-TEXTO",
        detailKey: "DETALHAMENTO-DO-TEXTO",
        basic: {
          title: "TITULO-DO-TEXTO",
          titleEnglish: "TITULO-DO-TEXTO-INGLES",
          year: "ANO-DO-TEXTO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DO-JORNAL-OU-REVISTA",
          volume: "VOLUME",
          pages: ["PAGINA-INICIAL", "PAGINA-FINAL"],
          place: "LOCAL-DE-PUBLICACAO",
          issn: "ISSN",
          publicationDate: "DATA-DE-PUBLICACAO"
        }
      },
      warnings
    )
  );

  const miscSection = getChild(production, "DEMAIS-TIPOS-DE-PRODUCAO-BIBLIOGRAFICA");
  items.push(
    ...extractMiscType(
      getChildren(miscSection, "OUTRA-PRODUCAO-BIBLIOGRAFICA"),
      {
        sourceType: "OUTRA-PRODUCAO-BIBLIOGRAFICA",
        basicKey: "DADOS-BASICOS-DE-OUTRA-PRODUCAO",
        detailKey: "DETALHAMENTO-DE-OUTRA-PRODUCAO",
        basic: {
          title: "TITULO",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          subtype: "NATUREZA"
        },
        detail: {
          publisher: "EDITORA",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISSN-ISBN",
          pageCount: "NUMERO-DE-PAGINAS"
        }
      },
      warnings
    )
  );

  items.push(
    ...extractMiscType(
      getChildren(miscSection, "PARTITURA-MUSICAL"),
      {
        sourceType: "PARTITURA-MUSICAL",
        basicKey: "DADOS-BASICOS-DA-PARTITURA",
        detailKey: "DETALHAMENTO-DA-PARTITURA",
        basic: {
          title: "TITULO",
          titleEnglish: "TITULO-INGLES",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          publisher: "EDITORA",
          place: "CIDADE-DA-EDITORA",
          pageCount: "NUMERO-DE-PAGINAS",
          extraNoteFields: ["FORMACAO-INSTRUMENTAL", "NUMERO-DO-CATALOGO"]
        }
      },
      warnings
    )
  );

  items.push(
    ...extractMiscType(
      getChildren(miscSection, "PREFACIO-POSFACIO"),
      {
        sourceType: "PREFACIO-POSFACIO",
        basicKey: "DADOS-BASICOS-DO-PREFACIO-POSFACIO",
        detailKey: "DETALHAMENTO-DO-PREFACIO-POSFACIO",
        basic: {
          title: "TITULO",
          titleEnglish: "TITULO-INGLES",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "TIPO",
          secondarySubtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DA-PUBLICACAO",
          volume: "VOLUME",
          number: "FASCICULO",
          series: "SERIE",
          publisher: "EDITORA-DO-PREFACIO-POSFACIO",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISSN-ISBN",
          edition: "NUMERO-DA-EDICAO-REVISAO",
          extraNoteFields: ["NOME-DO-AUTOR-DA-PUBLICACAO"]
        }
      },
      warnings
    )
  );

  items.push(
    ...extractMiscType(
      getChildren(miscSection, "TRADUCAO"),
      {
        sourceType: "TRADUCAO",
        basicKey: "DADOS-BASICOS-DA-TRADUCAO",
        detailKey: "DETALHAMENTO-DA-TRADUCAO",
        basic: {
          title: "TITULO",
          titleEnglish: "TITULO-INGLES",
          year: "ANO",
          country: "PAIS-DE-PUBLICACAO",
          language: "IDIOMA",
          medium: "MEIO-DE-DIVULGACAO",
          url: "HOME-PAGE-DO-TRABALHO",
          doi: "DOI",
          subtype: "NATUREZA"
        },
        detail: {
          containerTitle: "TITULO-DA-OBRA-ORIGINAL",
          volume: "VOLUME",
          number: "FASCICULO",
          series: "SERIE",
          publisher: "EDITORA-DA-TRADUCAO",
          place: "CIDADE-DA-EDITORA",
          isbn: "ISSN-ISBN",
          edition: "NUMERO-DA-EDICAO-REVISAO",
          pageCount: "NUMERO-DE-PAGINAS",
          extraNoteFields: ["NOME-DO-AUTOR-TRADUZIDO", "IDIOMA-DA-OBRA-ORIGINAL"]
        }
      },
      warnings
    )
  );

  return { items, warnings };
}

function extractWithConfig(
  nodes: Element[],
  config: ExtractionConfig,
  warnings: ConversionWarning[]
): LattesBibliographicItem[] {
  return nodes
    .map((node) => createItem(node, config, warnings))
    .filter(Boolean) as LattesBibliographicItem[];
}

function extractMiscType(
  nodes: Element[],
  config: ExtractionConfig,
  warnings: ConversionWarning[]
): MiscBibliographicItem[] {
  return nodes
    .map((node) => createItem(node, config, warnings))
    .filter(Boolean) as MiscBibliographicItem[];
}

function createItem(
  node: Element,
  config: ExtractionConfig,
  warnings: ConversionWarning[]
): LattesBaseItem | undefined {
  const basicAttrs = getAttrs(getChild(node, config.basicKey));
  const detailAttrs = getAttrs(getChild(node, config.detailKey));
  const sequence = cleanValue(getAttrs(node)["SEQUENCIA-PRODUCAO"]);
  const title = basicAttrs[config.basic.title];

  if (!title) {
    warnings.push({
      code: "missing-title",
      message: `Um registro ${config.sourceType} foi ignorado por não possuir título.`,
      sourceType: config.sourceType,
      sequence
    });
    return undefined;
  }

  const notes = mergeNotes(
    ...collectExtraNoteFields(detailAttrs, config.detail?.extraNoteFields),
    ...(config.extraNotes?.({
      basic: basicAttrs,
      detail: detailAttrs
    }) ?? [])
  );

  const subtypeParts = [
    config.basic.subtype ? basicAttrs[config.basic.subtype] : undefined,
    config.basic.secondarySubtype ? basicAttrs[config.basic.secondarySubtype] : undefined
  ].filter(Boolean);

  return {
    sourceType: config.sourceType,
    sequence,
    subtype: subtypeParts.join(" / ") || undefined,
    title,
    titleEnglish: config.basic.titleEnglish
      ? basicAttrs[config.basic.titleEnglish]
      : undefined,
    year: config.basic.year ? basicAttrs[config.basic.year] : undefined,
    publicationDate:
      config.detail?.publicationDate &&
      detailAttrs[config.detail.publicationDate],
    country: config.basic.country ? basicAttrs[config.basic.country] : undefined,
    language: config.basic.language ? basicAttrs[config.basic.language] : undefined,
    medium: config.basic.medium ? basicAttrs[config.basic.medium] : undefined,
    url: config.basic.url ? normalizeWorkUrl(basicAttrs[config.basic.url]) : undefined,
    doi: config.basic.doi ? basicAttrs[config.basic.doi] : undefined,
    isbn: config.detail?.isbn ? detailAttrs[config.detail.isbn] : undefined,
    issn: config.detail?.issn ? detailAttrs[config.detail.issn] : undefined,
    volume: config.detail?.volume ? detailAttrs[config.detail.volume] : undefined,
    number: config.detail?.number ? detailAttrs[config.detail.number] : undefined,
    series: config.detail?.series ? detailAttrs[config.detail.series] : undefined,
    pages: config.detail?.pages
      ? buildPages(
          detailAttrs[config.detail.pages[0]],
          detailAttrs[config.detail.pages[1]]
        )
      : undefined,
    publisher: config.detail?.publisher
      ? detailAttrs[config.detail.publisher]
      : undefined,
    place: config.detail?.place ? detailAttrs[config.detail.place] : undefined,
    containerTitle: config.detail?.containerTitle
      ? detailAttrs[config.detail.containerTitle]
      : undefined,
    eventName: config.detail?.eventName
      ? detailAttrs[config.detail.eventName]
      : undefined,
    editor: config.detail?.editor ? detailAttrs[config.detail.editor] : undefined,
    authors: extractAuthors(getChildren(node, "AUTORES")),
    keywords: listKeywords(getChild(node, "PALAVRAS-CHAVE")),
    notes,
    rawContext: {
      ...basicAttrs,
      ...detailAttrs
    },
    ...(config.detail?.edition
      ? { edition: detailAttrs[config.detail.edition] }
      : {}),
    ...(config.detail?.pageCount
      ? { pageCount: detailAttrs[config.detail.pageCount] }
      : {})
  };
}

function normalizeWorkUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const [firstUrl] = trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => cleanValue(item))
      .filter(Boolean) as string[];

    return firstUrl;
  }

  return trimmed;
}

function collectExtraNoteFields(
  detailAttrs: Record<string, string>,
  fields: string[] | undefined
): string[] {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) =>
      detailAttrs[field] ? `${field.replaceAll("-", " ")}: ${detailAttrs[field]}` : undefined
    )
    .filter(Boolean) as string[];
}
