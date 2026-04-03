export type OrcidV2StepId =
  | "upload"
  | "coverage"
  | "oauth"
  | "consent"
  | "review"
  | "manual"
  | "sync"
  | "report";

export type OrcidV2StepState = "complete" | "active" | "pending" | "attention";
export type OrcidV2SyncStatus = "auto-sync" | "review-required" | "manual-only" | "synced" | "skipped" | "warning";
export type OrcidV2Tone = "neutral" | "success" | "warning" | "danger" | "info";

export interface OrcidV2Step {
  id: OrcidV2StepId;
  label: string;
  title: string;
  summary: string;
  state: OrcidV2StepState;
}

export interface OrcidV2Artifact {
  name: string;
  sizeBytes?: number;
  encoding?: string;
  parsedAt?: string;
  sourceLabel?: string;
}

export interface OrcidV2CoverageItem {
  id: string;
  label: string;
  count: number;
  status: OrcidV2SyncStatus;
  note?: string;
}

export interface OrcidV2ConsentScope {
  scope: string;
  label: string;
  granted: boolean;
  mandatory?: boolean;
}

export interface OrcidV2Identity {
  connected: boolean;
  sandbox: boolean;
  orcidUri?: string;
  displayName?: string;
  tokenSummary?: string;
  scopes: string[];
}

export interface OrcidV2ReviewAction {
  id: string;
  label: string;
  tone?: "primary" | "secondary" | "danger";
}

export interface OrcidV2ReviewSection {
  id: string;
  title: string;
  endpoint: string;
  status: OrcidV2SyncStatus;
  summary: string;
  count: number;
  actions: OrcidV2ReviewAction[];
}

export interface OrcidV2ManualAction {
  id: string;
  title: string;
  reason: string;
  source: string;
  endpoint?: string;
  suggestion?: string;
  status: "queued" | "in-review" | "done";
}

export interface OrcidV2SyncItem {
  id: string;
  title: string;
  endpoint: string;
  status: "pending" | "success" | "failure" | "skipped";
  details: string;
  putCode?: string;
}

export interface OrcidV2SyncReport {
  state: "idle" | "syncing" | "complete" | "error";
  progress: number;
  total: number;
  items: OrcidV2SyncItem[];
  message?: string;
}

export interface OrcidV2MetaPanelItem {
  label: string;
  value: string;
}

export interface OrcidV2MetaPanel {
  id: string;
  title: string;
  summary: string;
  items?: OrcidV2MetaPanelItem[];
  bullets?: string[];
}

export interface OrcidV2WizardProps {
  steps: OrcidV2Step[];
  activeStepId: OrcidV2StepId;
  artifact?: OrcidV2Artifact;
  coverage: OrcidV2CoverageItem[];
  identity: OrcidV2Identity;
  consentScopes: OrcidV2ConsentScope[];
  reviewSections: OrcidV2ReviewSection[];
  manualQueue: OrcidV2ManualAction[];
  syncReport: OrcidV2SyncReport;
  metaPanels?: OrcidV2MetaPanel[];
  onStepChange?: (stepId: OrcidV2StepId) => void;
  onUploadSelect?: (file: File | null) => void;
  onAuthorize?: () => void;
  onPrimaryAction?: (actionId: string) => void;
  onManualAction?: (actionId: string, nextStatus: OrcidV2ManualAction["status"]) => void;
}
