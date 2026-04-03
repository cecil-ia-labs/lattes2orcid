export const ORCID_INTEGRATION_SOURCE = "lattes2orcid-v2" as const;
export const ORCID_API_VERSION = "v3.0" as const;

export const ORCID_SCOPES = [
  "/read-limited",
  "/activities/update",
  "/person/update"
] as const;

export const ORCID_REQUIRED_SCOPES = ORCID_SCOPES;

export type OrcidScope = (typeof ORCID_SCOPES)[number];
export type OrcidRequiredScope = OrcidScope;

export const ORCID_SECTION_TYPES = [
  "works",
  "employment",
  "education",
  "qualification",
  "invited-position",
  "membership",
  "service",
  "distinction",
  "researcher-urls",
  "keywords",
  "external-identifiers",
  "address"
] as const;

export type OrcidSectionType = (typeof ORCID_SECTION_TYPES)[number];
export type OrcidAffiliationSectionType = Extract<
  OrcidSectionType,
  | "employment"
  | "education"
  | "qualification"
  | "invited-position"
  | "membership"
  | "service"
  | "distinction"
>;

export type OrcidGatewayEndpoint = "/oauth/exchange" | "/oauth/refresh" | "/record";
export type OrcidSectionEndpoint = `/section/${OrcidSectionType}`;
export type OrcidEndpoint = OrcidGatewayEndpoint | OrcidSectionEndpoint;

export type OrcidMutationStatus =
  | "auto-sync"
  | "review-required"
  | "manual-only";
export type OrcidMutationKind = "create" | "update" | "delete" | "skip" | "manual";
export type OrcidOwnershipState = "owned" | "foreign" | "unknown" | "conflict";

export type OrcidIdentifierRelationship =
  | "self"
  | "part-of"
  | "version-of"
  | "funded-by";
export type OrcidContributorType = "author" | "editor" | "translator" | "chair";
export type OrcidWorkType =
  | "journal-article"
  | "conference-paper"
  | "book"
  | "book-chapter"
  | "newspaper-article"
  | "other";

export interface OrcidDateParts {
  year?: string;
  month?: string;
  day?: string;
}

export interface OrcidOrganization {
  name: string;
  city?: string;
  region?: string;
  country?: string;
  disambiguatedId?: string;
  disambiguatedSource?: string;
}

export interface OrcidContributor {
  name: string;
  creditName?: string;
  contributorType: OrcidContributorType;
  orcidUri?: string;
  order: number;
}

export interface OrcidExternalIdentifier {
  value: string;
  type: string;
  relationship: OrcidIdentifierRelationship;
  url?: string;
}

export interface OrcidSourceContext {
  sourceLabel: string;
  sourceType: string;
  sourceFingerprint: string;
  sequence?: string;
  raw?: Record<string, string>;
}

export interface OrcidWorkSource {
  sectionType: "works";
  title: string;
  workType: OrcidWorkType;
  subtitle?: string;
  journalTitle?: string;
  language?: string;
  url?: string;
  publicationDate?: OrcidDateParts;
  contributors: OrcidContributor[];
  externalIdentifiers: OrcidExternalIdentifier[];
  sourceContext: OrcidSourceContext;
}

export interface OrcidAffiliationSource {
  sectionType: OrcidAffiliationSectionType;
  organization: OrcidOrganization;
  roleTitle?: string;
  departmentName?: string;
  startDate?: OrcidDateParts;
  endDate?: OrcidDateParts;
  sourceContext: OrcidSourceContext;
}

export interface OrcidKeywordSource {
  sectionType: "keywords";
  keywords: string[];
  sourceContext: OrcidSourceContext;
}

export interface OrcidResearcherUrlSource {
  sectionType: "researcher-urls";
  urls: string[];
  sourceContext: OrcidSourceContext;
}

export interface OrcidExternalIdentifierSource {
  sectionType: "external-identifiers";
  identifiers: OrcidExternalIdentifier[];
  sourceContext: OrcidSourceContext;
}

export interface OrcidAddressSource {
  sectionType: "address";
  country?: string;
  sourceContext: OrcidSourceContext;
}

export type OrcidIntentSource =
  | OrcidWorkSource
  | OrcidAffiliationSource
  | OrcidKeywordSource
  | OrcidResearcherUrlSource
  | OrcidExternalIdentifierSource
  | OrcidAddressSource;

export interface OrcidMutationIntent<TSource extends OrcidIntentSource = OrcidIntentSource> {
  sectionType: TSource["sectionType"];
  status: OrcidMutationStatus;
  action: OrcidMutationKind;
  reason: string;
  sourceData: TSource;
}

export interface OrcidRemoteSectionRecord {
  putCode?: string;
  source?: string;
  sourceFingerprint?: string;
  label?: string;
  updatedAt?: string;
  payload?: Record<string, unknown>;
}

export interface OrcidRecordSnapshot {
  orcidUri: string;
  orcidName?: string;
  grantedScopes: OrcidScope[];
  sections: Partial<Record<OrcidSectionType, OrcidRemoteSectionRecord[]>>;
  source?: string;
}

export interface OrcidPayloadEnvelope<
  TSection extends OrcidSectionType = OrcidSectionType,
  TBody extends Record<string, unknown> = Record<string, unknown>
> {
  sectionType: TSection;
  endpoint: OrcidSectionEndpoint;
  method: "POST" | "PUT" | "DELETE";
  body: TBody;
  sourceContext: OrcidSourceContext;
  putCode?: string;
}

export interface OrcidSectionDraft<
  TSource extends OrcidIntentSource = OrcidIntentSource,
  TBody extends Record<string, unknown> = Record<string, unknown>
> {
  sectionType: TSource["sectionType"];
  endpoint: OrcidSectionEndpoint;
  method: "POST" | "PUT" | "DELETE";
  status: OrcidMutationStatus;
  action: OrcidMutationKind;
  reason: string;
  ownershipState: OrcidOwnershipState;
  sourceData: TSource;
  payload: TBody;
  sourceContext: OrcidSourceContext;
  putCode?: string;
  remotePutCode?: string;
}

export interface OrcidManualAction {
  sectionType: "biography" | "name" | "email" | "identity" | OrcidSectionType;
  title: string;
  reason: string;
  sourceContext: OrcidSourceContext;
  fields: Record<string, string>;
  suggestedResolution?: string;
}

export interface OrcidPutCodeEntry {
  sectionType: OrcidSectionType;
  putCode: string;
  sourceFingerprint: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrcidPutCodeRegistry {
  entries: OrcidPutCodeEntry[];
}

export interface OrcidSyncReport {
  created: number;
  updated: number;
  skipped: number;
  manual: number;
  failed: number;
}

export interface OrcidSessionState {
  authenticatedOrcidUri?: string;
  orcidName?: string;
  grantedScopes: OrcidScope[];
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  recordSnapshot?: OrcidRecordSnapshot;
  draftSections: OrcidSectionDraft[];
  manualQueue: OrcidManualAction[];
  syncReport?: OrcidSyncReport;
  putCodes: OrcidPutCodeRegistry;
}

export interface OrcidGatewayTokenExchangeRequest {
  code: string;
  redirectUri: string;
  scopes: OrcidScope[];
}

export interface OrcidGatewayTokenRefreshRequest {
  refreshToken: string;
}

export interface OrcidGatewayTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: "bearer";
  orcidUri: string;
  orcidName?: string;
  scopes: OrcidScope[];
}

export interface OrcidGatewayRecordResponse {
  snapshot: OrcidRecordSnapshot;
}

export interface OrcidGatewaySectionRequest<
  TBody extends Record<string, unknown> = Record<string, unknown>
> {
  orcidUri: string;
  sectionType: OrcidSectionType;
  method: "POST" | "PUT" | "DELETE";
  putCode?: string;
  body?: TBody;
}

export type SectionDraft = OrcidSectionDraft;

export type GatewayExchangeRequest = OrcidGatewayTokenExchangeRequest;

export type GatewayRefreshRequest = OrcidGatewayTokenRefreshRequest;

export interface GatewaySectionMutationRequest {
  accessToken: string;
  draft: OrcidSectionDraft;
}

export interface GatewayExchangeResponse {
  accessToken: string;
  refreshToken?: string;
  authenticatedOrcidUri: string;
  orcidName?: string;
  grantedScopes: OrcidScope[];
}

export interface GatewayRecordResponse {
  snapshot: OrcidRecordSnapshot;
}
