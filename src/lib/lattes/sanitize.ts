import { decodeXmlBytes, type XmlBinaryInput } from "@/lib/lattes/normalize";

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
    pattern:
      /NOME-COMPLETO-DO-AUTOR|NOME-COMPLETO-DO-PARTICIPANTE|NOME-DO-AUTOR-TRADUZIDO|NOME-DO-AUTOR-DA-PUBLICACAO|NOME-COMPLETO$/i,
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

export function sanitizeLattesXmlText(xml: string): string {
  return xml.replace(/<[^>]+>/g, sanitizeTag);
}

export function sanitizeLattesXmlBytes(input: XmlBinaryInput): string {
  const { xml } = decodeXmlBytes(input);
  return sanitizeLattesXmlText(xml);
}

export const sanitizeLattesXmlBuffer = sanitizeLattesXmlBytes;

function sanitizeTag(tag: string): string {
  if (tag.startsWith("<?") || tag.startsWith("<!")) {
    return tag;
  }

  return tag.replace(/([A-Za-z0-9_-]+)="([^"]*)"/g, (_match, key: string, value: string) => {
    const sanitizer = ATTRIBUTE_SANITIZERS.find(({ pattern }) => pattern.test(key));
    const replacement = sanitizer ? sanitizer.replacement(key) : value;
    return `${key}="${replacement}"`;
  });
}
