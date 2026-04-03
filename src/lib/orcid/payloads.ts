import type {
  OrcidAddressSource,
  OrcidAffiliationSource,
  OrcidExternalIdentifierSource,
  OrcidIntentSource,
  OrcidKeywordSource,
  OrcidMutationIntent,
  OrcidPayloadEnvelope,
  OrcidResearcherUrlSource,
  OrcidWorkSource
} from "@/lib/orcid/types";

export function buildPayloadEnvelope<TSource extends OrcidIntentSource>(
  intent: OrcidMutationIntent<TSource>
): OrcidPayloadEnvelope<TSource["sectionType"]> {
  return {
    sectionType: intent.sectionType,
    endpoint: `/section/${intent.sectionType}`,
    method: "POST",
    body: buildPayloadBody(intent.sourceData),
    sourceContext: intent.sourceData.sourceContext
  };
}

export function buildPayloadBody(
  sourceData: OrcidIntentSource
): Record<string, unknown> {
  switch (sourceData.sectionType) {
    case "works":
      return buildWorkPayload(sourceData);
    case "keywords":
      return buildKeywordPayload(sourceData);
    case "researcher-urls":
      return buildResearcherUrlPayload(sourceData);
    case "external-identifiers":
      return buildExternalIdentifierPayload(sourceData);
    case "address":
      return buildAddressPayload(sourceData);
    default:
      return buildAffiliationPayload(sourceData);
  }
}

function buildWorkPayload(sourceData: OrcidWorkSource): Record<string, unknown> {
  return {
    title: sourceData.title,
    subtitle: sourceData.subtitle,
    workType: sourceData.workType,
    journalTitle: sourceData.journalTitle,
    language: sourceData.language,
    url: sourceData.url,
    publicationDate: sourceData.publicationDate,
    contributors: sourceData.contributors,
    externalIdentifiers: sourceData.externalIdentifiers
  };
}

function buildAffiliationPayload(
  sourceData: OrcidAffiliationSource
): Record<string, unknown> {
  return {
    sectionType: sourceData.sectionType,
    organization: sourceData.organization,
    roleTitle: sourceData.roleTitle,
    departmentName: sourceData.departmentName,
    startDate: sourceData.startDate,
    endDate: sourceData.endDate
  };
}

function buildKeywordPayload(sourceData: OrcidKeywordSource): Record<string, unknown> {
  return {
    keywords: sourceData.keywords.map((keyword) => ({ content: keyword }))
  };
}

function buildResearcherUrlPayload(
  sourceData: OrcidResearcherUrlSource
): Record<string, unknown> {
  return {
    urls: sourceData.urls.map((url) => ({
      url,
      urlName: buildResearcherUrlLabel(url)
    }))
  };
}

function buildExternalIdentifierPayload(
  sourceData: OrcidExternalIdentifierSource
): Record<string, unknown> {
  return {
    identifiers: sourceData.identifiers
  };
}

function buildAddressPayload(sourceData: OrcidAddressSource): Record<string, unknown> {
  return {
    country: sourceData.country
  };
}

function buildResearcherUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Profile URL";
  }
}
