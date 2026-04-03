import { ConversionError } from "@/lib/lattes/errors";
import { decodeXmlBytes, parseXmlDocument, type XmlBinaryInput } from "@/lib/lattes/normalize";
import { getChild } from "@/lib/lattes/helpers";
import {
  extractNormalizedLattesProfile,
  type NormalizedLattesProfile
} from "@/lib/lattes/orcid-profile";
import { buildOrcidSyncPlan, type OrcidSyncPlan } from "@/lib/orcid/mapping";
import type { OrcidRecordSnapshot } from "@/lib/orcid/types";

export function extractProfileFromDocument(
  document: Document
): NormalizedLattesProfile {
  return extractNormalizedLattesProfile(document);
}

export function buildOrcidImportPlanFromBytes(
  input: XmlBinaryInput,
  originalFilename: string,
  snapshot?: OrcidRecordSnapshot
): OrcidSyncPlan {
  const { xml } = decodeXmlBytes(input);
  const document = parseXmlDocument(xml);

  if (!getChild(document, "CURRICULO-VITAE")) {
    throw new ConversionError(
      422,
      "invalid_root_element",
      "O XML enviado não possui o elemento raiz CURRICULO-VITAE."
    );
  }

  const profile = extractNormalizedLattesProfile(document);
  const plan = buildOrcidSyncPlan(profile, snapshot);

  return {
    ...plan,
    profile: {
      ...profile,
      source: {
        ...profile.source,
        identifier: profile.source.identifier ?? originalFilename
      }
    }
  };
}

export { extractNormalizedLattesProfile } from "@/lib/lattes/orcid-profile";
