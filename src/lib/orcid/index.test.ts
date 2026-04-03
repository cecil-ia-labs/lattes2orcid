// @vitest-environment jsdom

import { buildOrcidImportPlanFromBytes } from "@/lib/orcid";
import { buildPayloadBody } from "@/lib/orcid/payloads";
import type { OrcidAddressSource, OrcidRecordSnapshot } from "@/lib/orcid/types";
import { readFixtureText } from "@/lib/test-utils/fixtures";

describe("buildOrcidImportPlanFromBytes", () => {
  it("extracts the main v2 sync domains from the sanitized fixture", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const plan = await buildOrcidImportPlanFromBytes(
      new TextEncoder().encode(xml),
      "sanitized-lattes.xml"
    );

    expect(plan.drafts.some((draft) => draft.sectionType === "works")).toBe(true);
    expect(
      plan.drafts.some((draft) =>
        ["education", "qualification"].includes(draft.sectionType)
      )
    ).toBe(true);
    expect(
      plan.drafts.some((draft) =>
        ["employment", "invited-position", "membership", "service"].includes(
          draft.sectionType
        )
      )
    ).toBe(true);
    expect(plan.drafts.some((draft) => draft.sectionType === "keywords")).toBe(true);
    expect(plan.drafts.some((draft) => draft.sectionType === "address")).toBe(true);

    expect(plan.manualQueue.some((item) => item.sectionType === "biography")).toBe(true);
    expect(plan.manualQueue.some((item) => item.sectionType === "identity")).toBe(true);
    expect(plan.manualQueue.some((item) => item.sectionType === "email")).toBe(true);
  });

  it("reuses owned records and skips foreign-source collisions by fingerprint", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const basePlan = await buildOrcidImportPlanFromBytes(
      new TextEncoder().encode(xml),
      "sanitized-lattes.xml"
    );
    const targetDraft = basePlan.drafts.find((draft) => draft.sectionType === "works");

    expect(targetDraft).toBeDefined();

    const ownedSnapshot: OrcidRecordSnapshot = {
      orcidUri: "https://orcid.org/0000-0000-0000-0000",
      grantedScopes: [],
      sections: {
        works: [
          {
            putCode: "12345",
            source: "lattes2orcid-v2",
            sourceFingerprint: targetDraft?.sourceContext.sourceFingerprint
          }
        ]
      }
    };
    const foreignSnapshot: OrcidRecordSnapshot = {
      ...ownedSnapshot,
      sections: {
        works: [
          {
            putCode: "98765",
            source: "another-integration",
            sourceFingerprint: targetDraft?.sourceContext.sourceFingerprint
          }
        ]
      }
    };

    const ownedPlan = await buildOrcidImportPlanFromBytes(
      new TextEncoder().encode(xml),
      "sanitized-lattes.xml",
      ownedSnapshot
    );
    const foreignPlan = await buildOrcidImportPlanFromBytes(
      new TextEncoder().encode(xml),
      "sanitized-lattes.xml",
      foreignSnapshot
    );

    const updatedDraft = ownedPlan.drafts.find(
      (draft) =>
        draft.sectionType === "works" &&
        draft.sourceContext.sourceFingerprint === targetDraft?.sourceContext.sourceFingerprint
    );
    const skippedDraft = foreignPlan.drafts.find(
      (draft) =>
        draft.sectionType === "works" &&
        draft.sourceContext.sourceFingerprint === targetDraft?.sourceContext.sourceFingerprint
    );

    expect(updatedDraft?.action).toBe("update");
    expect(updatedDraft?.method).toBe("PUT");
    expect(updatedDraft?.putCode).toBe("12345");

    expect(skippedDraft?.action).toBe("skip");
    expect(skippedDraft?.status).toBe("review-required");
    expect(skippedDraft?.putCode).toBe("98765");
  });
});

describe("buildPayloadBody", () => {
  it("serializes ORCID address payloads as country-only data", () => {
    const payload = buildPayloadBody({
      sectionType: "address",
      country: "BR",
      sourceContext: {
        sourceLabel: "Lattes professional address",
        sourceType: "address",
        sourceFingerprint: "fingerprint-address"
      }
    } satisfies OrcidAddressSource);

    expect(payload).toEqual({ country: "BR" });
  });
});
