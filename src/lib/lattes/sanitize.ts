import { Builder } from "xml2js";
import { decodeXmlBuffer, parseXmlDocument } from "@/lib/lattes/normalize";
import type { XmlNode } from "@/lib/lattes/helpers";

const REDACTED = "DADO-REMOVIDO";
const NAME_PLACEHOLDERS = {
  citation: "EXEMPLO, P.",
  full: "Pesquisador Exemplo"
} as const;

const ATTRIBUTE_SANITIZERS: Array<{
  pattern: RegExp;
  replacement: (key: string) => string;
}> = [
  { pattern: /^CPF$/i, replacement: () => "00000000000" },
  { pattern: /PASSAPORTE|IDENTIDADE|EMISSOR|NRO-ID-CNPQ/i, replacement: () => REDACTED },
  { pattern: /^ORCID-ID$/i, replacement: () => "https://orcid.org/0000-0000-0000-0000" },
  { pattern: /E-?MAIL|ELETRONICO/i, replacement: () => "privado@example.test" },
  { pattern: /TELEFONE|FAX|RAMAL/i, replacement: () => "000000000" },
  { pattern: /CEP/i, replacement: () => "00000000" },
  { pattern: /LOGRADOURO|BAIRRO|CAIXA-POSTAL|COMPLEMENTO/i, replacement: () => REDACTED },
  { pattern: /CIDADE|UF|PAIS/i, replacement: () => REDACTED },
  { pattern: /NOME-DO-PAI|NOME-DA-MAE/i, replacement: () => NAME_PLACEHOLDERS.full },
  {
    pattern: /NOME-COMPLETO-DO-AUTOR|NOME-COMPLETO-DO-PARTICIPANTE|NOME-DO-AUTOR-TRADUZIDO|NOME-DO-AUTOR-DA-PUBLICACAO|NOME-COMPLETO$/i,
    replacement: () => NAME_PLACEHOLDERS.full
  },
  {
    pattern: /NOME-PARA-CITACAO/i,
    replacement: () => NAME_PLACEHOLDERS.citation
  },
  {
    pattern: /NOME-EM-CITACOES-BIBLIOGRAFICAS/i,
    replacement: () => `${NAME_PLACEHOLDERS.citation};${NAME_PLACEHOLDERS.full.toUpperCase()}`
  },
  {
    pattern: /^HOME-PAGE$/i,
    replacement: () => "https://example.test"
  },
  {
    pattern: /OUTRA-FORMA-DE-CONTATO|REDE-SOCIAL/i,
    replacement: () => REDACTED
  }
];

const XML_BUILDER = new Builder({
  headless: false,
  renderOpts: {
    pretty: true,
    indent: "  ",
    newline: "\n"
  },
  xmldec: {
    version: "1.0",
    encoding: "UTF-8"
  }
});

export async function sanitizeLattesXml(xml: string): Promise<string> {
  const document = await parseXmlDocument(xml);
  redactNode(document);
  return XML_BUILDER.buildObject(document);
}

export async function sanitizeLattesXmlBuffer(buffer: Buffer): Promise<string> {
  const { xml } = decodeXmlBuffer(buffer);
  return sanitizeLattesXml(xml);
}

function redactNode(value: unknown) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(redactNode);
    return;
  }

  const node = value as XmlNode;
  if (node.$) {
    for (const [key, rawValue] of Object.entries(node.$)) {
      if (typeof rawValue !== "string") {
        continue;
      }

      const sanitizer = ATTRIBUTE_SANITIZERS.find(({ pattern }) => pattern.test(key));
      if (sanitizer) {
        node.$[key] = sanitizer.replacement(key);
      }
    }
  }

  for (const child of Object.values(node)) {
    redactNode(child);
  }
}
