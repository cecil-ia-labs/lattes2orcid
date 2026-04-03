// @vitest-environment jsdom

import { buildOrcidImportPlanFromBytes } from "@/lib/orcid";
import { buildOrcidSyncPlan } from "@/lib/orcid/mapping";
import { extractNormalizedLattesProfile } from "@/lib/lattes/orcid-profile";
import { parseXmlDocument } from "@/lib/lattes/normalize";
import { readFixtureText } from "@/lib/test-utils/fixtures";

describe("extractNormalizedLattesProfile", () => {
  it("extracts non-bibliographic ORCID-relevant domains from the sanitized fixture", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const profile = extractNormalizedLattesProfile(parseXmlDocument(xml));

    expect(profile.person.fullName).toBe("Pesquisador Exemplo");
    expect(profile.person.orcidUri).toBe("https://orcid.org/0000-0000-0000-0000");
    expect(profile.biography.summary).toContain("Graduado em Comunicação Social");
    expect(profile.education.length).toBeGreaterThan(2);
    expect(profile.employments.length).toBeGreaterThan(3);
    expect(profile.distinctions).toHaveLength(1);
    expect(profile.areasOfInterest.length).toBeGreaterThan(0);
    expect(profile.contact.websites.some((value) => value.startsWith("https://"))).toBe(true);
  });
});

describe("buildOrcidSyncPlan", () => {
  it("classifies drafts, manual queue, and ownership-aware updates", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const profile = extractNormalizedLattesProfile(parseXmlDocument(xml));
    const initialPlan = buildOrcidSyncPlan(profile);

    expect(initialPlan.drafts.some((draft) => draft.sectionType === "works")).toBe(true);
    expect(initialPlan.drafts.some((draft) => draft.sectionType === "employment")).toBe(true);
    expect(initialPlan.manualQueue.some((item) => item.sectionType === "biography")).toBe(true);
    expect(initialPlan.manualQueue.some((item) => item.sectionType === "identity")).toBe(true);
    expect(initialPlan.manualQueue.some((item) => item.sectionType === "email")).toBe(true);

    const ownedDraft = initialPlan.drafts.find((draft) => draft.sectionType === "works");
    expect(ownedDraft).toBeDefined();

    const withSnapshot = buildOrcidSyncPlan(profile, {
      orcidUri: "https://orcid.org/0000-0000-0000-0000",
      grantedScopes: ["/read-limited", "/activities/update", "/person/update"],
      sections: {
        works: [
          {
            putCode: "12345",
            source: "lattes2orcid-v2",
            sourceFingerprint: ownedDraft?.sourceContext.sourceFingerprint
          }
        ]
      }
    });

    const updatedDraft = withSnapshot.drafts.find(
      (draft) => draft.sectionType === "works" && draft.putCode === "12345"
    );

    expect(updatedDraft?.action).toBe("update");
    expect(updatedDraft?.method).toBe("PUT");
  });
});

describe("buildOrcidImportPlanFromBytes", () => {
  it("returns a reviewable import plan with drafts and manual queue", async () => {
    const xml = await readFixtureText("real/sanitized-lattes.xml");
    const plan = await buildOrcidImportPlanFromBytes(
      new TextEncoder().encode(xml),
      "sanitized-lattes.xml"
    );

    expect(plan.profile.bibliographicItems.length).toBeGreaterThan(20);
    expect(plan.drafts.length).toBeGreaterThan(10);
    expect(plan.manualQueue.length).toBeGreaterThan(0);
    expect(plan.report.created).toBeGreaterThan(0);
  });
});
