import type {
  NormalizedLattesAddress,
  NormalizedLattesDistinction,
  NormalizedLattesEducation,
  NormalizedLattesEmployment,
  NormalizedLattesProfile
} from "@/lib/lattes/orcid-profile";
import type { LattesBibliographicItem } from "@/lib/lattes/types";
import { buildOrcidSectionDrafts, summarizeDrafts } from "@/lib/orcid/diff";
import type {
  OrcidAffiliationSectionType,
  OrcidAffiliationSource,
  OrcidContributor,
  OrcidExternalIdentifier,
  OrcidKeywordSource,
  OrcidManualAction,
  OrcidMutationIntent,
  OrcidRecordSnapshot,
  OrcidResearcherUrlSource,
  OrcidSectionDraft,
  OrcidSyncReport,
  OrcidWorkSource
} from "@/lib/orcid/types";
import {
  buildLattesSourceContext,
  canonicalizeText,
  choosePrimaryUrl,
  isHttpsUrl,
  stableFingerprint,
  toOrcidDateParts
} from "@/lib/orcid/utils";

export interface OrcidSyncPlan {
  profile: NormalizedLattesProfile;
  intents: OrcidMutationIntent[];
  drafts: OrcidSectionDraft[];
  manualQueue: OrcidManualAction[];
  report: OrcidSyncReport;
}

export function buildOrcidSyncPlan(
  profile: NormalizedLattesProfile,
  snapshot?: OrcidRecordSnapshot
): OrcidSyncPlan {
  const intents = buildMutationIntents(profile);
  const drafts = buildOrcidSectionDrafts(intents, snapshot);
  const manualQueue = buildManualQueue(profile, drafts);
  const summary = summarizeDrafts(drafts);

  return {
    profile,
    intents,
    drafts,
    manualQueue,
    report: {
      created: summary.create,
      updated: summary.update,
      skipped: summary.skip,
      manual: manualQueue.length,
      failed: summary.reviewRequired
    }
  };
}

export function buildMutationIntents(
  profile: NormalizedLattesProfile
): OrcidMutationIntent[] {
  return [
    ...buildWorkIntents(profile.bibliographicItems),
    ...buildEducationIntents(profile.education),
    ...buildEmploymentIntents(profile.employments),
    ...buildDistinctionIntents(profile.distinctions),
    ...buildKeywordIntents(profile),
    ...buildResearcherUrlIntents(profile),
    ...buildAddressIntents(profile.addresses)
  ];
}

export function buildManualQueue(
  profile: NormalizedLattesProfile,
  drafts: OrcidSectionDraft[]
): OrcidManualAction[] {
  const queue: OrcidManualAction[] = [];

  if (
    profile.biography.summary ||
    profile.biography.summaryEnglish ||
    profile.biography.notes.length > 0
  ) {
    queue.push({
      sectionType: "biography",
      title: "Revisar biografia",
      reason: "A biografia na ORCID pertence ao pesquisador e não deve entrar em sincronização automática.",
      sourceContext: buildLattesSourceContext(
        "Currículo Lattes",
        "biography",
        stableFingerprint(profile.biography)
      ),
      fields: {
        summary: profile.biography.summary ?? "",
        summaryEnglish: profile.biography.summaryEnglish ?? "",
        notes: profile.biography.notes.join(" | ")
      },
      suggestedResolution:
        "Mostre o texto pronto para cópia e oriente a pessoa a atualizá-lo manualmente na ORCID."
    });
  }

  if (
    profile.person.fullName ||
    profile.person.citationName ||
    profile.person.orcidUri
  ) {
    queue.push({
      sectionType: "identity",
      title: "Confirmar ORCID iD autenticado",
      reason: "A identidade precisa vir do OAuth, nunca de preenchimento manual.",
      sourceContext: buildLattesSourceContext(
        "Currículo Lattes",
        "identity",
        stableFingerprint(profile.person),
        undefined,
        profile.person.raw
      ),
      fields: {
        fullName: profile.person.fullName ?? "",
        citationName: profile.person.citationName ?? "",
        lattesOrcid: profile.person.orcidUri ?? ""
      },
      suggestedResolution:
        "Compare o ORCID iD autenticado via OAuth com o iD declarado no XML antes de escrever qualquer dado."
    });
  }

  if (profile.contact.professionalEmail || profile.contact.residentialEmail) {
    queue.push({
      sectionType: "email",
      title: "Manter e-mails sob controle manual",
      reason: "Os e-mails na ORCID pertencem ao pesquisador e não devem ser escritos pela integração.",
      sourceContext: buildLattesSourceContext(
        "Contato no Lattes",
        "email",
        stableFingerprint(profile.contact.raw),
        undefined,
        profile.contact.raw
      ),
      fields: {
        professionalEmail: profile.contact.professionalEmail ?? "",
        residentialEmail: profile.contact.residentialEmail ?? ""
      }
    });
  }

  for (const draft of drafts.filter((entry) => entry.status === "review-required")) {
    queue.push({
      sectionType: draft.sectionType,
      title: `Revisar ${getSectionLabel(draft.sectionType)}`,
      reason: draft.reason,
      sourceContext: draft.sourceContext,
      fields: flattenPayload(draft.payload)
    });
  }

  return dedupeManualQueue(queue);
}

function buildWorkIntents(items: LattesBibliographicItem[]): OrcidMutationIntent[] {
  return items.map((item) => {
    const sourceContext = buildLattesSourceContext(
      `Produção Lattes ${item.sequence ?? item.sourceType}`,
      "works",
      stableFingerprint({
        sourceType: item.sourceType,
        sequence: item.sequence,
        title: item.title,
        year: item.year,
        doi: item.doi,
        isbn: item.isbn,
        issn: item.issn
      }),
      item.sequence,
      {
        sourceType: item.sourceType,
        title: item.title,
        year: item.year ?? "",
        doi: item.doi ?? "",
        isbn: item.isbn ?? "",
        issn: item.issn ?? ""
      }
    );

    const sourceData: OrcidWorkSource = {
      sectionType: "works",
      title: item.title,
      subtitle: item.titleEnglish,
      workType: resolveWorkType(item.sourceType),
      journalTitle: item.containerTitle,
      language: item.language,
      url: choosePrimaryUrl([item.url].filter(Boolean) as string[]),
      publicationDate: toOrcidDateParts(item.publicationDate ?? item.year),
      contributors: item.authors.map<OrcidContributor>((author, index) => ({
        name: author.fullName,
        creditName: author.citationName,
        contributorType: "author",
        order: author.order ?? index + 1
      })),
      externalIdentifiers: buildWorkIdentifiers(item),
      sourceContext
    };

    return {
      sectionType: "works",
      status:
        sourceData.externalIdentifiers.length > 0 ? "auto-sync" : "review-required",
      action: "create",
      reason: `Mapear ${item.sourceType} para a seção Works da ORCID.`,
      sourceData
    };
  });
}

function buildEducationIntents(
  education: NormalizedLattesEducation[]
): OrcidMutationIntent[] {
  return education.map((entry) => {
    const sectionType = classifyEducationSection(entry);
    const sourceData: OrcidAffiliationSource = {
      sectionType,
      organization: buildOrganization(entry.institution, entry.organizationId),
      roleTitle: entry.title ?? entry.course ?? entry.level,
      departmentName: entry.course,
      startDate: entry.startDate,
      endDate: entry.endDate,
      sourceContext: buildLattesSourceContext(
        `Formação Lattes ${entry.sequence ?? entry.tagName}`,
        sectionType,
        stableFingerprint(entry),
        entry.sequence,
        entry.raw
      )
    };

    return {
      sectionType,
      status: "auto-sync",
      action: "create",
      reason: `Mapear ${entry.tagName} para ${getSectionLabel(sectionType)} na ORCID.`,
      sourceData
    };
  });
}

function buildEmploymentIntents(
  employments: NormalizedLattesEmployment[]
): OrcidMutationIntent[] {
  return employments.map((entry) => {
    const sectionType = classifyEmploymentSection(entry);
    const sourceData: OrcidAffiliationSource = {
      sectionType,
      organization: buildOrganization(entry.institution, entry.organizationId),
      roleTitle: entry.role ?? entry.activitySummary,
      departmentName: entry.department,
      startDate: entry.startDate,
      endDate: entry.endDate,
      sourceContext: buildLattesSourceContext(
        `Atuação Lattes ${entry.sequence ?? entry.tagName}`,
        sectionType,
        stableFingerprint(entry),
        entry.sequence,
        entry.raw
      )
    };

    return {
      sectionType,
      status: "review-required",
      action: "create",
      reason: `Mapear a atuação profissional para ${getSectionLabel(sectionType)} na ORCID.`,
      sourceData
    };
  });
}

function buildDistinctionIntents(
  distinctions: NormalizedLattesDistinction[]
): OrcidMutationIntent[] {
  return distinctions.map((entry) => {
    const sourceData: OrcidAffiliationSource = {
      sectionType: "distinction",
      organization: buildOrganization(entry.promoter),
      roleTitle: entry.title,
      sourceContext: buildLattesSourceContext(
        `Distinção Lattes ${entry.title ?? "prêmio"}`,
        "distinction",
        stableFingerprint(entry),
        undefined,
        entry.raw
      )
    };

    return {
      sectionType: "distinction",
      status: "review-required",
      action: "create",
      reason: "Mapear prêmios e títulos para a seção de distinções da ORCID.",
      sourceData
    };
  });
}

function buildKeywordIntents(
  profile: NormalizedLattesProfile
): OrcidMutationIntent[] {
  const keywords = dedupeStrings(
    profile.areasOfInterest.flatMap((entry) =>
      [entry.area, entry.subArea, entry.specialty].filter(Boolean) as string[]
    )
  );

  if (keywords.length === 0) {
    return [];
  }

  const sourceData: OrcidKeywordSource = {
    sectionType: "keywords",
    keywords,
    sourceContext: buildLattesSourceContext(
      "Áreas de atuação no Lattes",
      "keywords",
      stableFingerprint(keywords),
      undefined,
      { keywords: keywords.join(" | ") }
    )
  };

  return [
    {
      sectionType: "keywords",
      status: "auto-sync",
      action: "create",
      reason: "Mapear áreas de atuação para as palavras-chave da ORCID.",
      sourceData
    }
  ];
}

function buildResearcherUrlIntents(
  profile: NormalizedLattesProfile
): OrcidMutationIntent[] {
  const urls = dedupeStrings(
    [...profile.contact.websites, ...profile.contact.socialLinks].filter(isHttpsUrl)
  );

  if (urls.length === 0) {
    return [];
  }

  const sourceData: OrcidResearcherUrlSource = {
    sectionType: "researcher-urls",
    urls,
    sourceContext: buildLattesSourceContext(
      "URLs do perfil Lattes",
      "researcher-urls",
      stableFingerprint(urls),
      undefined,
      { urls: urls.join(" | ") }
    )
  };

  return [
    {
      sectionType: "researcher-urls",
      status: "review-required",
      action: "create",
      reason: "Mapear URLs públicas confiáveis para os links do pesquisador na ORCID.",
      sourceData
    }
  ];
}

function buildAddressIntents(
  addresses: NormalizedLattesAddress[]
): OrcidMutationIntent[] {
  return addresses.flatMap((address) => {
    if (!address.country) {
      return [];
    }

    return [
      {
        sectionType: "address" as const,
        status: "review-required" as const,
        action: "create" as const,
        reason:
          "Somente o país confirmado deve entrar no endereço pessoal da ORCID.",
        sourceData: {
          sectionType: "address",
          country: address.country,
          sourceContext: buildLattesSourceContext(
            `Endereço ${address.kind} no Lattes`,
            "address",
            stableFingerprint(address),
            undefined,
            address.raw
          )
        }
      }
    ];
  });
}

function buildWorkIdentifiers(item: LattesBibliographicItem): OrcidExternalIdentifier[] {
  const identifiers: OrcidExternalIdentifier[] = [];

  if (item.doi) {
    identifiers.push({
      value: item.doi,
      type: "doi",
      relationship: "self",
      url: `https://doi.org/${item.doi}`
    });
  }

  if (item.isbn) {
    identifiers.push({
      value: item.isbn,
      type: "isbn",
      relationship: "part-of"
    });
  }

  if (item.issn) {
    identifiers.push({
      value: item.issn,
      type: "issn",
      relationship: "part-of"
    });
  }

  if (item.url && isHttpsUrl(item.url)) {
    identifiers.push({
      value: item.url,
      type: "url",
      relationship: "self",
      url: item.url
    });
  }

  return identifiers;
}

function resolveWorkType(sourceType: LattesBibliographicItem["sourceType"]) {
  switch (sourceType) {
    case "TRABALHO-EM-EVENTOS":
      return "conference-paper";
    case "ARTIGO-PUBLICADO":
    case "ARTIGO-ACEITO-PARA-PUBLICACAO":
      return "journal-article";
    case "LIVRO-PUBLICADO-OU-ORGANIZADO":
      return "book";
    case "CAPITULO-DE-LIVRO-PUBLICADO":
      return "book-chapter";
    case "TEXTO-EM-JORNAL-OU-REVISTA":
      return "newspaper-article";
    default:
      return "other";
  }
}

function classifyEducationSection(
  entry: NormalizedLattesEducation
): OrcidAffiliationSectionType {
  const tag = canonicalizeText(entry.tagName) ?? "";

  if (
    tag.includes("especializacao") ||
    tag.includes("aperfeicoamento") ||
    tag.includes("livre docencia")
  ) {
    return "qualification";
  }

  return "education";
}

function classifyEmploymentSection(
  entry: NormalizedLattesEmployment
): OrcidAffiliationSectionType {
  const descriptor =
    canonicalizeText(
      [entry.role, entry.activitySummary, entry.department, entry.tagName]
        .filter(Boolean)
        .join(" ")
    ) ?? "";

  if (
    descriptor.includes("visitante") ||
    descriptor.includes("guest") ||
    descriptor.includes("invited")
  ) {
    return "invited-position";
  }

  if (
    descriptor.includes("membro") ||
    descriptor.includes("associacao") ||
    descriptor.includes("association")
  ) {
    return "membership";
  }

  if (
    descriptor.includes("servico") ||
    descriptor.includes("direcao") ||
    descriptor.includes("administracao") ||
    descriptor.includes("secretaria")
  ) {
    return "service";
  }

  return "employment";
}

function buildOrganization(name?: string, identifier?: string) {
  return {
    name: name ?? "Organização não identificada",
    disambiguatedId: identifier,
    disambiguatedSource: identifier ? "Lattes" : undefined
  };
}

function getSectionLabel(sectionType: string) {
  switch (sectionType) {
    case "works":
      return "produções";
    case "education":
      return "formação";
    case "qualification":
      return "qualificações";
    case "employment":
      return "vínculos";
    case "invited-position":
      return "posições como visitante";
    case "membership":
      return "associações";
    case "service":
      return "serviços";
    case "distinction":
      return "distinções";
    case "keywords":
      return "palavras-chave";
    case "researcher-urls":
      return "links do pesquisador";
    case "external-identifiers":
      return "identificadores externos";
    case "address":
      return "endereço";
    default:
      return sectionType;
  }
}

function flattenPayload(payload: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((entry) => stringifyValue(entry)).join(" | ")
        : stringifyValue(value)
    ])
  );
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function dedupeManualQueue(queue: OrcidManualAction[]): OrcidManualAction[] {
  const seen = new Set<string>();
  const result: OrcidManualAction[] = [];

  for (const action of queue) {
    const key = stableFingerprint({
      sectionType: action.sectionType,
      title: action.title,
      fields: action.fields
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(action);
  }

  return result;
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
