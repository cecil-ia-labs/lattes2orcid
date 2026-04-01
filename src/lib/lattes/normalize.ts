import { Parser } from "xml2js";
import { ApiError } from "@/lib/lattes/errors";
import type { XmlNode } from "@/lib/lattes/helpers";

const XML_PARSER = new Parser({
  attrkey: "$",
  explicitArray: false,
  explicitRoot: true,
  trim: true
});

export function detectXmlEncoding(buffer: Buffer): BufferEncoding {
  const header = buffer.subarray(0, 256).toString("ascii");
  const match = header.match(/encoding=["']([^"']+)["']/i);
  const encoding = match?.[1]?.toLowerCase();

  if (!encoding) {
    return "utf8";
  }

  if (
    encoding.includes("8859-1") ||
    encoding.includes("latin1") ||
    encoding.includes("iso-ir-100")
  ) {
    return "latin1";
  }

  return "utf8";
}

export function decodeXmlBuffer(buffer: Buffer): { xml: string; encoding: BufferEncoding } {
  const encoding = detectXmlEncoding(buffer);
  const xml = buffer.toString(encoding);
  return { xml, encoding };
}

export async function parseXmlDocument(xml: string): Promise<XmlNode> {
  try {
    return (await XML_PARSER.parseStringPromise(xml)) as XmlNode;
  } catch {
    throw new ApiError(400, "invalid_xml", "O arquivo enviado não é um XML válido.");
  }
}
