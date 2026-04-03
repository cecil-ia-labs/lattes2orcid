import { ConversionError } from "@/lib/lattes/errors";
import { extractBibliographicItems } from "@/lib/lattes/extract";
import { mapToBibTeXEntries } from "@/lib/lattes/map";
import { decodeXmlBytes, parseXmlDocument, type XmlBinaryInput } from "@/lib/lattes/normalize";
import { serializeBibTeX } from "@/lib/lattes/serialize";
import type { ConversionResponse } from "@/lib/lattes/types";
import { getChild } from "@/lib/lattes/helpers";

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export async function convertLattesXmlBytes(
  input: XmlBinaryInput,
  originalFilename: string
): Promise<ConversionResponse> {
  const { xml } = decodeXmlBytes(input);
  const document = parseXmlDocument(xml);

  if (!getChild(document, "CURRICULO-VITAE")) {
    throw new ConversionError(
      422,
      "invalid_root_element",
      "O XML enviado não possui o elemento raiz CURRICULO-VITAE."
    );
  }

  const extracted = extractBibliographicItems(document);

  if (extracted.items.length === 0) {
    throw new ConversionError(
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

export const convertLattesXmlBuffer = convertLattesXmlBytes;

function buildOutputFilename(originalFilename: string): string {
  const baseName = originalFilename.split(/[\\/]/).pop() ?? originalFilename;
  const withoutExtension = baseName.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "curriculo-lattes"}.bib`;
}

function buildCategorySummary(
  items: Array<{ sourceType: string }>
): Record<string, number> {
  return items.reduce<Record<string, number>>((summary, item) => {
    summary[item.sourceType] = (summary[item.sourceType] ?? 0) + 1;
    return summary;
  }, {});
}
