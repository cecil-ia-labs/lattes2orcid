import { ORCID_API_VERSION, ORCID_REQUIRED_SCOPES, type OrcidRequiredScope } from "@/lib/orcid/types";

export interface OrcidGatewayConfig {
  gatewayUrl?: string;
  sandboxBaseUrl: string;
  apiVersion: typeof ORCID_API_VERSION;
  clientId?: string;
  redirectUri?: string;
  scopes: OrcidRequiredScope[];
}

export function getOrcidGatewayConfig(): OrcidGatewayConfig {
  const sandboxBaseUrl = import.meta.env.VITE_ORCID_BASE_URL?.trim() || "https://sandbox.orcid.org";
  const gatewayUrl = import.meta.env.VITE_ORCID_GATEWAY_URL?.trim() || undefined;
  const clientId = import.meta.env.VITE_ORCID_CLIENT_ID?.trim() || undefined;
  const redirectUri = import.meta.env.VITE_ORCID_REDIRECT_URI?.trim() || undefined;

  return {
    gatewayUrl,
    sandboxBaseUrl,
    apiVersion: ORCID_API_VERSION,
    clientId,
    redirectUri,
    scopes: [...ORCID_REQUIRED_SCOPES]
  };
}

export function buildOrcidAuthorizeUrl(config: OrcidGatewayConfig): string | undefined {
  if (!config.clientId || !config.redirectUri) {
    return undefined;
  }

  const url = new URL("/oauth/authorize", config.sandboxBaseUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("redirect_uri", config.redirectUri);
  return url.toString();
}

