import { ConversionError } from "@/lib/lattes/errors";
import { getChild } from "@/lib/lattes/helpers";
import {
  decodeXmlBytes,
  parseXmlDocument,
  type XmlBinaryInput
} from "@/lib/lattes/normalize";
import {
  extractNormalizedLattesProfile,
  type NormalizedLattesProfile
} from "@/lib/lattes/orcid-profile";
import { buildOrcidSyncPlan, type OrcidSyncPlan } from "@/lib/orcid/mapping";
import type { OrcidRecordSnapshot } from "@/lib/orcid/types";

export interface OrcidImportPlan extends OrcidSyncPlan {
  profile: NormalizedLattesProfile;
}

export async function buildOrcidImportPlanFromBytes(
  input: XmlBinaryInput,
  _originalFilename: string,
  snapshot?: OrcidRecordSnapshot
): Promise<OrcidImportPlan> {
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
  return buildOrcidSyncPlan(profile, snapshot);
}

export * from "@/lib/orcid/diff";
export * from "@/lib/orcid/mapping";
export * from "@/lib/orcid/ownership";
export * from "@/lib/orcid/payloads";
export * from "@/lib/orcid/types";
export * from "@/lib/orcid/utils";
