import { toSlug } from "@/lib/lattes/helpers";
import type { OrcidDateParts, OrcidSourceContext } from "@/lib/orcid/types";

const ORCID_ID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

export function normalizeOrcidId(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = value
    .trim()
    .replace(/^https?:\/\/orcid\.org\//i, "")
    .replace(/^orcid\.org\//i, "")
    .replace(/^\/+/, "");

  const match = candidate.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
  const id = match?.[1] ?? candidate;

  return ORCID_ID_PATTERN.test(id) ? id : undefined;
}

export function normalizeOrcidUri(value?: string): string | undefined {
  const id = normalizeOrcidId(value);
  return id ? `https://orcid.org/${id}` : undefined;
}

export function isHttpsUrl(value?: string): value is string {
  return Boolean(value && /^https:\/\//i.test(value));
}

export function extractUrls(value?: string): string[] {
  if (!value) {
    return [];
  }

  const matches = value.match(/https?:\/\/[^\s,\])]+/gi) ?? [];
  return matches
    .map((entry) => entry.replace(/[>,.;]+$/g, ""))
    .filter(isHttpsUrl);
}

export function choosePrimaryUrl(values: string[]): string | undefined {
  return values.find(isHttpsUrl);
}

export function canonicalizeText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return normalized || undefined;
}

export function stableFingerprint(value: unknown): string {
  const canonical = JSON.stringify(canonicalizeValue(value));
  let hash = 2166136261;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function toOrcidDateParts(value?: string): OrcidDateParts | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 8) {
    return {
      day: digits.slice(0, 2),
      month: digits.slice(2, 4),
      year: digits.slice(4, 8)
    };
  }

  if (digits.length === 6) {
    return {
      month: digits.slice(0, 2),
      year: digits.slice(2, 6)
    };
  }

  if (digits.length === 4) {
    return { year: digits };
  }

  return undefined;
}

export function toOrcidDatePartsFromPieces(
  year?: string,
  month?: string,
  day?: string
): OrcidDateParts | undefined {
  const normalizedYear = normalizeDigits(year, 4);
  const normalizedMonth = normalizeDigits(month, 2);
  const normalizedDay = normalizeDigits(day, 2);

  if (!normalizedYear && !normalizedMonth && !normalizedDay) {
    return undefined;
  }

  return {
    year: normalizedYear,
    month: normalizedMonth,
    day: normalizedDay
  };
}

export function slugOrFallback(
  value: string | undefined,
  fallback: string
): string {
  const slug = value ? toSlug(value) : "";
  return slug || fallback;
}

export function buildLattesSourceContext(
  sourceLabel: string,
  sourceType: string,
  sourceFingerprint: string,
  sequence?: string,
  raw?: Record<string, string>
): OrcidSourceContext {
  return {
    sourceLabel,
    sourceType,
    sourceFingerprint:
      sourceFingerprint ||
      stableFingerprint({ sourceLabel, sourceType, sequence, raw }),
    sequence,
    raw
  };
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeValue(entry)] as const)
    );
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function normalizeDigits(value?: string, length?: number): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  return length && digits.length < length ? digits.padStart(length, "0") : digits;
}
