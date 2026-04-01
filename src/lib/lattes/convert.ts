import path from "node:path";
import { ApiError } from "@/lib/lattes/errors";
import { extractBibliographicItems } from "@/lib/lattes/extract";
import { mapToBibTeXEntries } from "@/lib/lattes/map";
import { decodeXmlBuffer, parseXmlDocument } from "@/lib/lattes/normalize";
import { serializeBibTeX } from "@/lib/lattes/serialize";
import type { ConversionResponse } from "@/lib/lattes/types";
import { getChild } from "@/lib/lattes/helpers";

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export async function convertLattesXmlBuffer(
  buffer: Buffer,
  originalFilename: string
): Promise<ConversionResponse> {
  const { xml } = decodeXmlBuffer(buffer);
  const document = await parseXmlDocument(xml);

  if (!getChild(document, "CURRICULO-VITAE")) {
    throw new ApiError(
      422,
      "invalid_root_element",
      "O XML enviado não possui o elemento raiz CURRICULO-VITAE."
    );
  }

  const extracted = extractBibliographicItems(document);

  if (extracted.items.length === 0) {
    throw new ApiError(
      422,
      "missing_bibliographic_content",
      "Nenhuma produção bibliográfica foi encontrada no currículo informado."
    );
  }

  const mapped = mapToBibTeXEntries(extracted.items);
  const bibtex = serializeBibTeX(mapped.entries);

  return {
    filename: buildOutputFilename(originalFilename),
    bibtex,
    summary: {
      totalItems: extracted.items.length,
      convertedItems: mapped.entries.length,
      skippedItems: extracted.items.length - mapped.entries.length,
      fallbackMiscItems: mapped.entries.filter((entry) => entry.entryType === "misc").length,
      categories: buildCategorySummary(extracted.items)
    },
    warnings: [...extracted.warnings, ...mapped.warnings]
  };
}

function buildOutputFilename(originalFilename: string): string {
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  return `${baseName || "curriculo-lattes"}.bib`;
}

function buildCategorySummary(
  items: Array<{ sourceType: string }>
): Record<string, number> {
  return items.reduce<Record<string, number>>((summary, item) => {
    summary[item.sourceType] = (summary[item.sourceType] ?? 0) + 1;
    return summary;
  }, {});
}
