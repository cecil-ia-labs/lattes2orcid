import { HomePage } from "@/components/home-page";
import { OrcidV2Page } from "@/components/orcid-v2-page";
import { AppProviders } from "@/components/app-providers";

export default function App() {
  const route = resolveAppRoute(window.location.pathname);

  return (
    <AppProviders>
      {route === "v2" ? <OrcidV2Page /> : <HomePage />}
    </AppProviders>
  );
}

function resolveAppRoute(pathname: string): "v1" | "v2" {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized.endsWith("/v2") ? "v2" : "v1";
}
