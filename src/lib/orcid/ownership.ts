import { ORCID_INTEGRATION_SOURCE } from "@/lib/orcid/types";
import type {
  OrcidOwnershipState,
  OrcidRecordSnapshot,
  OrcidRemoteSectionRecord,
  OrcidSectionType
} from "@/lib/orcid/types";
import { canonicalizeText } from "@/lib/orcid/utils";

export function classifyOwnership(
  record: OrcidRemoteSectionRecord | undefined,
  integrationSource = ORCID_INTEGRATION_SOURCE
): OrcidOwnershipState {
  if (!record) {
    return "unknown";
  }

  const knownSources = [record.source, record.label].map(canonicalizeText);
  const normalizedIntegration = canonicalizeText(integrationSource);

  if (knownSources.includes(normalizedIntegration)) {
    return "owned";
  }

  if (record.source || record.label) {
    return "foreign";
  }

  return "unknown";
}

export function canMutateRemoteRecord(
  record: OrcidRemoteSectionRecord | undefined,
  integrationSource = ORCID_INTEGRATION_SOURCE
): boolean {
  return classifyOwnership(record, integrationSource) === "owned";
}

export function findRemoteRecord(
  snapshot: OrcidRecordSnapshot | undefined,
  sectionType: OrcidSectionType,
  sourceFingerprint: string
): OrcidRemoteSectionRecord | undefined {
  return snapshot?.sections[sectionType]?.find(
    (record) => record.sourceFingerprint === sourceFingerprint
  );
}
