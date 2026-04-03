import type {
  GatewayExchangeRequest,
  GatewayExchangeResponse,
  GatewayRefreshRequest,
  GatewaySectionMutationRequest,
  GatewayRecordResponse,
  OrcidRecordSnapshot,
  OrcidSyncReport,
  OrcidSectionDraft
} from "@/lib/orcid/types";

function ensureGatewayUrl(gatewayUrl?: string): string {
  if (!gatewayUrl) {
    throw new Error(
      "O gateway ORCID não está configurado. Defina VITE_ORCID_GATEWAY_URL para habilitar OAuth e sincronização."
    );
  }

  return gatewayUrl.replace(/\/+$/, "");
}

export async function exchangeAuthorizationCode(
  gatewayUrl: string | undefined,
  payload: GatewayExchangeRequest
): Promise<GatewayExchangeResponse> {
  const response = await fetch(`${ensureGatewayUrl(gatewayUrl)}/oauth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse<Record<string, unknown>>(response);
  return normalizeGatewayExchangeResponse(data);
}

export async function refreshGatewaySession(
  gatewayUrl: string | undefined,
  payload: GatewayRefreshRequest
): Promise<GatewayExchangeResponse> {
  const response = await fetch(`${ensureGatewayUrl(gatewayUrl)}/oauth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse<Record<string, unknown>>(response);
  return normalizeGatewayExchangeResponse(data);
}

export async function fetchOrcidRecord(
  gatewayUrl: string | undefined,
  accessToken: string
): Promise<OrcidRecordSnapshot> {
  const response = await fetch(`${ensureGatewayUrl(gatewayUrl)}/record`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await parseJsonResponse<GatewayRecordResponse | OrcidRecordSnapshot>(response);
  return "snapshot" in data ? data.snapshot : data;
}

export async function syncDraftSections(
  gatewayUrl: string | undefined,
  mutations: GatewaySectionMutationRequest[]
): Promise<OrcidSyncReport> {
  const startedAt = new Date().toISOString();

  if (!gatewayUrl) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      manual: mutations.length,
      failed: mutations.length
    };
  }

  const results = await Promise.all(
    mutations.map(async (mutation) => {
      if (mutation.draft.action === "skip" || mutation.draft.status === "manual-only") {
        return mutation.draft;
      }

      const response = await fetch(
        `${ensureGatewayUrl(gatewayUrl)}/section/${mutation.draft.sectionType}`,
        {
          method: resolveHttpMethod(mutation.draft.method),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mutation.accessToken}`
          },
          body: JSON.stringify(mutation.draft)
        }
      );

      return parseJsonResponse<{ message?: string }>(response).then(() => mutation.draft);
    })
  );

  const completedAt = new Date().toISOString();
  void startedAt;
  void completedAt;

  return summarizeSyncReport(results);
}

function resolveHttpMethod(method: OrcidSectionDraft["method"]): "POST" | "PUT" | "DELETE" {
  return method;
}

function summarizeSyncReport(drafts: OrcidSectionDraft[]): OrcidSyncReport {
  return {
    created: drafts.filter((draft) => draft.action === "create").length,
    updated: drafts.filter((draft) => draft.action === "update").length,
    skipped: drafts.filter((draft) => draft.action === "skip").length,
    manual: drafts.filter((draft) => draft.action === "manual" || draft.status === "manual-only").length,
    failed: drafts.filter((draft) => draft.status === "review-required").length
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "A chamada para o gateway ORCID falhou.");
  }

  return payload as T;
}

function normalizeGatewayExchangeResponse(
  payload: Record<string, unknown>
): GatewayExchangeResponse {
  const grantedScopes = normalizeScopes(payload.grantedScopes ?? payload.scopes ?? payload.scope);
  const authenticatedOrcidUri = normalizeAuthenticatedOrcidUri(payload);

  return {
    accessToken: readString(payload.accessToken) ?? readString(payload.access_token) ?? "",
    refreshToken: readString(payload.refreshToken) ?? readString(payload.refresh_token),
    authenticatedOrcidUri,
    orcidName: readString(payload.orcidName) ?? readString(payload.name),
    grantedScopes
  };
}

function normalizeScopes(input: unknown): GatewayExchangeResponse["grantedScopes"] {
  if (typeof input === "string") {
    return input
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(
        (scope): scope is GatewayExchangeResponse["grantedScopes"][number] =>
          ["/read-limited", "/activities/update", "/person/update"].includes(scope)
      );
  }

  if (Array.isArray(input)) {
    return input.filter(
      (scope): scope is GatewayExchangeResponse["grantedScopes"][number] =>
        typeof scope === "string" &&
        ["/read-limited", "/activities/update", "/person/update"].includes(scope)
    );
  }

  return [];
}

function normalizeAuthenticatedOrcidUri(payload: Record<string, unknown>): string {
  const candidate =
    readString(payload.authenticatedOrcidUri) ??
    readString(payload.orcidUri) ??
    readString(payload.orcid) ??
    readString(payload.sub);

  if (!candidate) {
    return "";
  }

  return candidate.startsWith("http") ? candidate : `https://orcid.org/${candidate}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
