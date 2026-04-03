import { findRemoteRecord } from "@/lib/orcid/ownership";
import { buildPayloadEnvelope } from "@/lib/orcid/payloads";
import type {
  OrcidMutationIntent,
  OrcidOwnershipState,
  OrcidRecordSnapshot,
  OrcidRemoteSectionRecord,
  OrcidSectionDraft
} from "@/lib/orcid/types";

export function buildOrcidSectionDrafts(
  intents: OrcidMutationIntent[],
  snapshot?: OrcidRecordSnapshot
): OrcidSectionDraft[] {
  return intents.map((intent) => buildSectionDraft(intent, snapshot));
}

export function summarizeDrafts(drafts: OrcidSectionDraft[]) {
  return drafts.reduce(
    (summary, draft) => {
      summary[draft.action] += 1;
      if (draft.status === "review-required") {
        summary.reviewRequired += 1;
      }
      if (draft.status === "manual-only") {
        summary.manualOnly += 1;
      }
      return summary;
    },
    {
      create: 0,
      update: 0,
      delete: 0,
      skip: 0,
      manual: 0,
      reviewRequired: 0,
      manualOnly: 0
    }
  );
}

function buildSectionDraft(
  intent: OrcidMutationIntent,
  snapshot?: OrcidRecordSnapshot
): OrcidSectionDraft {
  const envelope = buildPayloadEnvelope(intent);
  const remoteRecord = findRemoteRecord(
    snapshot,
    intent.sectionType,
    intent.sourceData.sourceContext.sourceFingerprint
  );
  const ownershipState = resolveOwnershipState(remoteRecord);

  const draft: OrcidSectionDraft = {
    sectionType: intent.sectionType,
    endpoint: envelope.endpoint,
    method: envelope.method,
    status: intent.status,
    action: intent.action,
    reason: intent.reason,
    ownershipState,
    sourceData: intent.sourceData,
    payload: envelope.body,
    sourceContext: envelope.sourceContext,
    putCode: remoteRecord?.putCode,
    remotePutCode: remoteRecord?.putCode
  };

  if (!remoteRecord) {
    return draft;
  }

  if (ownershipState === "owned") {
    return {
      ...draft,
      action: "update",
      method: "PUT",
      reason: `${intent.reason} Existing item is owned by this integration.`
    };
  }

  return {
    ...draft,
    action: "skip",
    status: "review-required",
    reason: `${intent.reason} Existing item belongs to another source and requires manual review.`
  };
}

function resolveOwnershipState(
  remoteRecord: OrcidRemoteSectionRecord | undefined
): OrcidOwnershipState {
  if (!remoteRecord) {
    return "unknown";
  }

  if (remoteRecord.source?.toLowerCase().includes("lattes2orcid-v2")) {
    return "owned";
  }

  if (remoteRecord.source || remoteRecord.label) {
    return "foreign";
  }

  return "unknown";
}
