import { ConversionError } from "@/lib/lattes/errors";

export type XmlBinaryInput = ArrayBuffer | ArrayBufferView;

export function detectXmlEncoding(input: XmlBinaryInput): string {
  const bytes = toUint8Array(input);
  const header = new TextDecoder("ascii").decode(bytes.subarray(0, 256));
  const match = header.match(/encoding=["']([^"']+)["']/i);
  const encoding = match?.[1]?.toLowerCase();

  if (!encoding) {
    return "utf-8";
  }

  if (
    encoding.includes("8859-1") ||
    encoding.includes("latin1") ||
    encoding.includes("iso-ir-100")
  ) {
    return "iso-8859-1";
  }

  return "utf-8";
}

export function decodeXmlBytes(input: XmlBinaryInput): { xml: string; encoding: string } {
  const bytes = toUint8Array(input);
  const encoding = detectXmlEncoding(bytes);

  try {
    return {
      xml: new TextDecoder(encoding).decode(bytes),
      encoding
    };
  } catch {
    return {
      xml: new TextDecoder("utf-8").decode(bytes),
      encoding: "utf-8"
    };
  }
}

export function parseXmlDocument(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new ConversionError(400, "invalid_xml", "O arquivo enviado não é um XML válido.");
  }

  return document;
}

export function toUint8Array(input: XmlBinaryInput): Uint8Array {
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  if (Object.prototype.toString.call(input) === "[object ArrayBuffer]") {
    return new Uint8Array(input);
  }

  return new Uint8Array(input as ArrayBufferLike);
}
