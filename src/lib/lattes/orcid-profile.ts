import { extractBibliographicItems } from "@/lib/lattes/extract";
import {
  cleanValue,
  getAttrs,
  getChild,
  getChildren,
  mergeNotes
} from "@/lib/lattes/helpers";
import type { LattesBibliographicItem } from "@/lib/lattes/types";
import type { OrcidDateParts } from "@/lib/orcid/types";
import {
  extractUrls,
  normalizeOrcidUri,
  toOrcidDatePartsFromPieces
} from "@/lib/orcid/utils";

export interface NormalizedLattesProfile {
  source: {
    identifier?: string;
    updatedAt?: string;
    origin?: string;
  };
  person: {
    fullName?: string;
    citationName?: string;
    orcidUri?: string;
    nationality?: string;
    birthDate?: string;
    gender?: string;
    disclosurePermission?: string;
    raw: Record<string, string>;
  };
  biography: {
    summary?: string;
    summaryEnglish?: string;
    notes: string[];
  };
  contact: {
    professionalEmail?: string;
    residentialEmail?: string;
    websites: string[];
    socialLinks: string[];
    raw: Record<string, string>;
  };
  addresses: NormalizedLattesAddress[];
  education: NormalizedLattesEducation[];
  employments: NormalizedLattesEmployment[];
  areasOfInterest: NormalizedLattesArea[];
  languages: NormalizedLattesLanguage[];
  distinctions: NormalizedLattesDistinction[];
  bibliographicItems: LattesBibliographicItem[];
  manualSignals: string[];
}

export interface NormalizedLattesAddress {
  kind: "professional" | "residential";
  preferred?: boolean;
  organizationName?: string;
  departmentName?: string;
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  website?: string;
  email?: string;
  raw: Record<string, string>;
}

export interface NormalizedLattesEducation {
  tagName: string;
  sequence?: string;
  level?: string;
  institution?: string;
  organizationId?: string;
  course?: string;
  title?: string;
  advisor?: string;
  startDate?: OrcidDateParts;
  endDate?: OrcidDateParts;
  completionStatus?: string;
  scholarship?: string;
  raw: Record<string, string>;
}

export interface NormalizedLattesEmployment {
  tagName: string;
  sequence?: string;
  institution?: string;
  organizationId?: string;
  department?: string;
  role?: string;
  startDate?: OrcidDateParts;
  endDate?: OrcidDateParts;
  hoursPerWeek?: string;
  employmentFlag?: boolean;
  exclusive?: boolean;
  activitySummary?: string;
  raw: Record<string, string>;
}

export interface NormalizedLattesArea {
  sequence?: string;
  grandArea?: string;
  area?: string;
  subArea?: string;
  specialty?: string;
  raw: Record<string, string>;
}

export interface NormalizedLattesLanguage {
  code?: string;
  description?: string;
  reading?: string;
  speaking?: string;
  writing?: string;
  comprehension?: string;
  raw: Record<string, string>;
}

export interface NormalizedLattesDistinction {
  title?: string;
  promoter?: string;
  year?: string;
  englishTitle?: string;
  raw: Record<string, string>;
}

export function extractNormalizedLattesProfile(
  root: Document | Element
): NormalizedLattesProfile {
  const curriculum = resolveCurriculumRoot(root);
  const curriculumAttrs = getAttrs(curriculum);
  const general = getChild(curriculum, "DADOS-GERAIS");
  const addressContainer = getChild(general, "ENDERECO");
  const educationRoot = getChild(general, "FORMACAO-ACADEMICA-TITULACAO");
  const employmentRoot = getChild(general, "ATUACOES-PROFISSIONAIS");
  const areasRoot = getChild(general, "AREAS-DE-ATUACAO");
  const languagesRoot = getChild(general, "IDIOMAS");
  const distinctionsRoot = getChild(general, "PREMIOS-TITULOS");

  const generalAttrs = getAttrs(general);
  const summaryAttrs = getAttrs(getChild(general, "RESUMO-CV"));
  const notesAttrs = getAttrs(getChild(general, "OUTRAS-INFORMACOES-RELEVANTES"));
  const professionalAddress = getChild(addressContainer, "ENDERECO-PROFISSIONAL");
  const residentialAddress = getChild(addressContainer, "ENDERECO-RESIDENCIAL");

  return {
    source: {
      identifier: curriculumAttrs["NUMERO-IDENTIFICADOR"],
      updatedAt: buildUpdatedAt(
        curriculumAttrs["DATA-ATUALIZACAO"],
        curriculumAttrs["HORA-ATUALIZACAO"]
      ),
      origin: curriculumAttrs["SISTEMA-ORIGEM-XML"]
    },
    person: {
      fullName: generalAttrs["NOME-COMPLETO"],
      citationName: generalAttrs["NOME-EM-CITACOES-BIBLIOGRAFICAS"],
      orcidUri: normalizeOrcidUri(generalAttrs["ORCID-ID"]),
      nationality:
        generalAttrs["PAIS-DE-NACIONALIDADE"] ??
        generalAttrs["SIGLA-PAIS-NACIONALIDADE"],
      birthDate: generalAttrs["DATA-NASCIMENTO"],
      gender: generalAttrs["SEXO"],
      disclosurePermission: generalAttrs["PERMISSAO-DE-DIVULGACAO"],
      raw: generalAttrs
    },
    biography: {
      summary: summaryAttrs["TEXTO-RESUMO-CV-RH"],
      summaryEnglish: summaryAttrs["TEXTO-RESUMO-CV-RH-EN"],
      notes: mergeNotes(notesAttrs["OUTRAS-INFORMACOES-RELEVANTES"])
    },
    contact: {
      professionalEmail: getAttrs(professionalAddress)["E-MAIL"],
      residentialEmail: getAttrs(residentialAddress)["E-MAIL"],
      websites: collectUrlsFromAddress(addressContainer),
      socialLinks: collectSocialLinks(addressContainer),
      raw: {
        ...getAttrs(addressContainer),
        ...getAttrs(professionalAddress),
        ...getAttrs(residentialAddress)
      }
    },
    addresses: [
      buildAddress("professional", addressContainer, professionalAddress),
      buildAddress("residential", addressContainer, residentialAddress)
    ].filter((entry): entry is NormalizedLattesAddress => Boolean(entry)),
    education: extractEducationEntries(educationRoot),
    employments: extractEmploymentEntries(employmentRoot),
    areasOfInterest: extractAreas(areasRoot),
    languages: extractLanguages(languagesRoot),
    distinctions: extractDistinctions(distinctionsRoot),
    bibliographicItems: extractBibliographicItems(
      root instanceof Document ? root : curriculum.ownerDocument ?? curriculum
    ).items,
    manualSignals: buildManualSignals(generalAttrs, summaryAttrs, notesAttrs)
  };
}

function resolveCurriculumRoot(root: Document | Element): Element {
  if (root instanceof Element && root.tagName === "CURRICULO-VITAE") {
    return root;
  }

  const curriculum = getChild(root, "CURRICULO-VITAE");
  if (!curriculum) {
    throw new Error("The supplied XML does not contain CURRICULO-VITAE.");
  }

  return curriculum;
}

function extractEducationEntries(
  root: Element | undefined
): NormalizedLattesEducation[] {
  if (!root) {
    return [];
  }

  return Array.from(root.children).map((child) => {
    const raw = getAttrs(child);
    return {
      tagName: child.tagName,
      sequence: raw["SEQUENCIA-FORMACAO"],
      level: raw["NIVEL"],
      institution:
        raw["NOME-INSTITUICAO"] ??
        raw["NOME-INSTITUICAO-GRAD"] ??
        raw["NOME-INSTITUICAO-DOUT"],
      organizationId:
        raw["CODIGO-INSTITUICAO"] ??
        raw["CODIGO-INSTITUICAO-GRAD"] ??
        raw["CODIGO-INSTITUICAO-DOUT"],
      course: raw["NOME-CURSO"] ?? raw["NOME-CURSO-INGLES"],
      title:
        raw["TITULO-DO-TRABALHO-DE-CONCLUSAO-DE-CURSO"] ??
        raw["TITULO-DA-DISSERTACAO-TESE"] ??
        raw["TITULO-DO-TRABALHO-DE-CONCLUSAO-DE-CURSO-INGLES"] ??
        raw["TITULO-DA-DISSERTACAO-TESE-INGLES"],
      advisor:
        raw["NOME-DO-ORIENTADOR"] ?? raw["NOME-COMPLETO-DO-ORIENTADOR"],
      startDate: toOrcidDatePartsFromPieces(raw["ANO-DE-INICIO"]),
      endDate: toOrcidDatePartsFromPieces(
        raw["ANO-DE-CONCLUSAO"] ?? raw["ANO-DE-OBTENCAO-DO-TITULO"]
      ),
      completionStatus: raw["STATUS-DO-CURSO"],
      scholarship: raw["FLAG-BOLSA"],
      raw
    };
  });
}

function extractEmploymentEntries(
  root: Element | undefined
): NormalizedLattesEmployment[] {
  if (!root) {
    return [];
  }

  const entries: NormalizedLattesEmployment[] = [];

  for (const activity of Array.from(root.children)) {
    if (activity.tagName !== "ATUACAO-PROFISSIONAL") {
      continue;
    }

    const base = getAttrs(activity);
    const links = getChildren(activity, "VINCULOS");
    const activityGroups = [
      ...getChildren(activity, "ATIVIDADES-DE-SERVICO-TECNICO-ESPECIALIZADO"),
      ...getChildren(activity, "ATIVIDADES-DE-DIRECAO-E-ADMINISTRACAO"),
      ...getChildren(activity, "OUTRAS-ATIVIDADES-TECNICO-CIENTIFICA")
    ];

    if (links.length === 0) {
      entries.push({
        tagName: activity.tagName,
        sequence: base["SEQUENCIA-ATIVIDADE"],
        institution: base["NOME-INSTITUICAO"],
        organizationId: base["CODIGO-INSTITUICAO"],
        department: collectActivityDepartments(activityGroups),
        role: collectActivitySummaries(activityGroups),
        activitySummary: collectActivitySummaries(activityGroups),
        raw: base
      });
      continue;
    }

    for (const link of links) {
      const linkAttrs = getAttrs(link);
      entries.push({
        tagName: activity.tagName,
        sequence: base["SEQUENCIA-ATIVIDADE"] ?? linkAttrs["SEQUENCIA-HISTORICO"],
        institution: base["NOME-INSTITUICAO"],
        organizationId: base["CODIGO-INSTITUICAO"],
        department: collectActivityDepartments(activityGroups),
        role:
          linkAttrs["OUTRO-ENQUADRAMENTO-FUNCIONAL-INFORMADO"] ??
          linkAttrs["ENQUADRAMENTO-FUNCIONAL"] ??
          linkAttrs["TIPO-DE-VINCULO"],
        startDate: toOrcidDatePartsFromPieces(
          linkAttrs["ANO-INICIO"],
          linkAttrs["MES-INICIO"]
        ),
        endDate: toOrcidDatePartsFromPieces(
          linkAttrs["ANO-FIM"],
          linkAttrs["MES-FIM"]
        ),
        hoursPerWeek: linkAttrs["CARGA-HORARIA-SEMANAL"],
        employmentFlag: linkAttrs["FLAG-VINCULO-EMPREGATICIO"] === "SIM",
        exclusive: linkAttrs["FLAG-DEDICACAO-EXCLUSIVA"] === "SIM",
        activitySummary: collectActivitySummaries(activityGroups),
        raw: { ...base, ...linkAttrs }
      });
    }
  }

  return entries;
}

function extractAreas(root: Element | undefined): NormalizedLattesArea[] {
  if (!root) {
    return [];
  }

  return getChildren(root, "AREA-DE-ATUACAO").map((node) => {
    const raw = getAttrs(node);
    return {
      sequence: raw["SEQUENCIA-AREA-DE-ATUACAO"],
      grandArea: raw["NOME-GRANDE-AREA-DO-CONHECIMENTO"],
      area: raw["NOME-DA-AREA-DO-CONHECIMENTO"],
      subArea: raw["NOME-DA-SUB-AREA-DO-CONHECIMENTO"],
      specialty: raw["NOME-DA-ESPECIALIDADE"],
      raw
    };
  });
}

function extractLanguages(root: Element | undefined): NormalizedLattesLanguage[] {
  if (!root) {
    return [];
  }

  return getChildren(root, "IDIOMA").map((node) => {
    const raw = getAttrs(node);
    return {
      code: raw["IDIOMA"],
      description: raw["DESCRICAO-DO-IDIOMA"],
      reading: raw["PROFICIENCIA-DE-LEITURA"],
      speaking: raw["PROFICIENCIA-DE-FALA"],
      writing: raw["PROFICIENCIA-DE-ESCRITA"],
      comprehension: raw["PROFICIENCIA-DE-COMPREENSAO"],
      raw
    };
  });
}

function extractDistinctions(
  root: Element | undefined
): NormalizedLattesDistinction[] {
  if (!root) {
    return [];
  }

  return getChildren(root, "PREMIO-TITULO").map((node) => {
    const raw = getAttrs(node);
    return {
      title: raw["NOME-DO-PREMIO-OU-TITULO"],
      promoter: raw["NOME-DA-ENTIDADE-PROMOTORA"],
      year: raw["ANO-DA-PREMIACAO"],
      englishTitle: raw["NOME-DO-PREMIO-OU-TITULO-INGLES"],
      raw
    };
  });
}

function buildAddress(
  kind: "professional" | "residential",
  addressContainer: Element | undefined,
  candidate: Element | undefined
): NormalizedLattesAddress | undefined {
  if (!candidate) {
    return undefined;
  }

  const containerAttrs = getAttrs(addressContainer);
  const raw = {
    ...containerAttrs,
    ...getAttrs(candidate)
  };

  return {
    kind,
    preferred: containerAttrs["FLAG-DE-PREFERENCIA"]?.includes(
      kind === "professional" ? "PROFISSIONAL" : "RESIDENCIAL"
    ),
    organizationName: raw["NOME-INSTITUICAO-EMPRESA"],
    departmentName: raw["NOME-ORGAO"] ?? raw["NOME-UNIDADE"],
    country: raw["PAIS"],
    region: raw["UF"],
    city: raw["CIDADE"],
    postalCode: raw["CEP"],
    website: raw["HOME-PAGE"],
    email: raw["E-MAIL"],
    raw
  };
}

function collectUrlsFromAddress(addressContainer: Element | undefined): string[] {
  if (!addressContainer) {
    return [];
  }

  const values = [
    ...Array.from(addressContainer.children).map(
      (node) => getAttrs(node)["HOME-PAGE"]
    ),
    getAttrs(addressContainer)["REDE-SOCIAL"]
  ];

  return values.flatMap((value) => extractUrls(value));
}

function collectSocialLinks(addressContainer: Element | undefined): string[] {
  if (!addressContainer) {
    return [];
  }

  return extractUrls(getAttrs(addressContainer)["REDE-SOCIAL"]);
}

function collectActivitySummaries(nodes: Element[]): string | undefined {
  return (
    nodes
      .map((node) => pickActivitySummary(node))
      .filter(Boolean)
      .join("; ") || undefined
  );
}

function collectActivityDepartments(nodes: Element[]): string | undefined {
  return (
    nodes
      .map((node) => getAttrs(node)["NOME-ORGAO"])
      .filter(Boolean)
      .join("; ") || undefined
  );
}

function pickActivitySummary(node: Element): string | undefined {
  const attrs = getAttrs(node);
  return (
    attrs["SERVICO-REALIZADO"] ??
    attrs["CARGO-OU-FUNCAO"] ??
    attrs["ATIVIDADE-REALIZADA"] ??
    attrs["OUTRAS-INFORMACOES"] ??
    attrs["OUTRO-ENQUADRAMENTO-FUNCIONAL-INFORMADO"]
  );
}

function buildManualSignals(
  generalAttrs: Record<string, string>,
  summaryAttrs: Record<string, string>,
  notesAttrs: Record<string, string>
): string[] {
  return [
    generalAttrs["NOME-EM-CITACOES-BIBLIOGRAFICAS"],
    generalAttrs["ORCID-ID"],
    summaryAttrs["TEXTO-RESUMO-CV-RH"],
    summaryAttrs["TEXTO-RESUMO-CV-RH-EN"],
    notesAttrs["OUTRAS-INFORMACOES-RELEVANTES"]
  ].filter((value): value is string => Boolean(cleanValue(value)));
}

function buildUpdatedAt(date?: string, time?: string): string | undefined {
  const normalizedDate = date?.replace(/\D/g, "");
  const normalizedTime = time?.replace(/\D/g, "");
  if (!normalizedDate && !normalizedTime) {
    return undefined;
  }

  if (normalizedDate?.length === 8) {
    const day = normalizedDate.slice(0, 2);
    const month = normalizedDate.slice(2, 4);
    const year = normalizedDate.slice(4, 8);
    const clock =
      normalizedTime && normalizedTime.length === 6
        ? `${normalizedTime.slice(0, 2)}:${normalizedTime.slice(2, 4)}:${normalizedTime.slice(4, 6)}`
        : undefined;

    return `${year}-${month}-${day}${clock ? `T${clock}` : ""}`;
  }

  return normalizedDate;
}
