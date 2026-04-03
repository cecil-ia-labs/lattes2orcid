import type {
  OrcidV2Artifact,
  OrcidV2ConsentScope,
  OrcidV2CoverageItem,
  OrcidV2Identity,
  OrcidV2ManualAction,
  OrcidV2ReviewSection,
  OrcidV2Step,
  OrcidV2StepId,
  OrcidV2SyncReport
} from "@/components/v2/types";

export const demoV2Steps: OrcidV2Step[] = [
  {
    id: "upload",
    label: "01",
    title: "Upload",
    summary: "Carregue o XML do Lattes e detecte a cobertura.",
    state: "complete"
  },
  {
    id: "coverage",
    label: "02",
    title: "Cobertura",
    summary: "Veja o que pode seguir automaticamente, o que exige revisão e o que fica manual.",
    state: "complete"
  },
  {
    id: "oauth",
    label: "03",
    title: "Login ORCID",
    summary: "Autentique o iD e recupere o registro atual.",
    state: "complete"
  },
  {
    id: "consent",
    label: "04",
    title: "Consentimento",
    summary: "Revise escopos e o que será escrito.",
    state: "active"
  },
  {
    id: "review",
    label: "05",
    title: "Revisão",
    summary: "Valide produções, vínculos e identificadores antes do envio.",
    state: "pending"
  },
  {
    id: "manual",
    label: "06",
    title: "Fila manual",
    summary: "Campos sensíveis ou ambíguos vão para revisão assistida.",
    state: "pending"
  },
  {
    id: "sync",
    label: "07",
    title: "Sincronização",
    summary: "Envie os itens aceitos para o ORCID.",
    state: "pending"
  },
  {
    id: "report",
    label: "08",
    title: "Relatório",
    summary: "Confirme o que foi criado, atualizado e mantido para revisão.",
    state: "pending"
  }
];

export const demoV2Artifact: OrcidV2Artifact = {
  name: "sanitized-lattes.xml",
  sizeBytes: 846_192,
  encoding: "UTF-8",
  parsedAt: "2026-04-03T19:52:00Z",
  sourceLabel: "XML Lattes"
};

export const demoV2Coverage: OrcidV2CoverageItem[] = [
  { id: "works", label: "Produções", count: 46, status: "auto-sync", note: "Publicações e identificadores prontos para a API de Works da ORCID." },
  { id: "employment", label: "Vínculos", count: 8, status: "review-required", note: "Datas e papéis institucionais precisam de uma revisão final." },
  { id: "education", label: "Formação", count: 4, status: "auto-sync", note: "Instituição, curso e datas já foram conciliados." },
  { id: "distinction", label: "Distinções", count: 1, status: "review-required", note: "O texto do prêmio pode ser enviado após confirmação." },
  { id: "manual", label: "Somente manual", count: 3, status: "manual-only", note: "Biografia, nomes principais e campos de contato ficam fora do auto-sync." }
];

export const demoV2Identity: OrcidV2Identity = {
  connected: true,
  sandbox: true,
  orcidUri: "https://orcid.org/0000-0002-1825-0097",
  displayName: "Pesquisador Exemplo",
  tokenSummary: "Escopos de leitura, atividades e pessoa concedidos",
  scopes: ["/read-limited", "/activities/update", "/person/update"]
};

export const demoV2ConsentScopes: OrcidV2ConsentScope[] = [
  { scope: "/read-limited", label: "Leitura do registro", granted: true, mandatory: true },
  { scope: "/activities/update", label: "Atualização de atividades", granted: true, mandatory: true },
  { scope: "/person/update", label: "Atualização de dados pessoais", granted: false, mandatory: false }
];

export const demoV2ReviewSections: OrcidV2ReviewSection[] = [
  {
    id: "works",
    title: "Produções",
    endpoint: "/works",
    status: "auto-sync",
    summary: "46 itens prontos para criação direta com identificadores e dados de autoria.",
    count: 46,
    actions: [
      { id: "accept-works", label: "Aceitar tudo", tone: "primary" },
      { id: "inspect-works", label: "Inspecionar amostra", tone: "secondary" }
    ]
  },
  {
    id: "affiliations",
    title: "Vínculos e afiliações",
    endpoint: "/affiliations",
    status: "review-required",
    summary: "Datas e nomes institucionais já existem, mas devem ser conferidos antes da escrita.",
    count: 12,
    actions: [
      { id: "accept-affiliations", label: "Aceitar com revisão", tone: "primary" },
      { id: "queue-affiliations", label: "Enviar para a fila manual", tone: "secondary" }
    ]
  }
];

export const demoV2ManualQueue: OrcidV2ManualAction[] = [
  {
    id: "bio",
    title: "Biografia",
    reason: "O registro ORCID trata esse campo como conteúdo do próprio pesquisador, então ele permanece manual.",
    source: "DADOS-GERAIS / RESUMO-CV",
    suggestion: "Mostre um resumo pronto para copiar e explique que o pesquisador deve colar esse conteúdo manualmente.",
    status: "queued"
  },
  {
    id: "primary-name",
    title: "Campos do nome principal",
    reason: "Os nomes pertencem ao pesquisador e não devem ser escritos automaticamente a partir do XML Lattes.",
    source: "DADOS-GERAIS",
    suggestion: "Mostre o nome normalizado e deixe o usuário confirmar ou ignorar.",
    status: "queued"
  }
];

export const demoV2SyncReport: OrcidV2SyncReport = {
  state: "syncing",
  progress: 68,
  total: 71,
  message: "Usando o sandbox da ORCID e preservando os limites de ownership dos dados já existentes no registro.",
  items: [
    {
      id: "works-1",
      title: "46 produções preparadas",
      endpoint: "/works",
      status: "success",
      details: "Identificadores e metadados de autoria validados.",
      putCode: "12345"
    },
    {
      id: "affiliations-1",
      title: "12 vínculos em revisão",
      endpoint: "/affiliations",
      status: "pending",
      details: "Aguardando confirmação de datas e papéis."
    },
    {
      id: "manual-1",
      title: "3 itens somente manuais retidos",
      endpoint: "/person",
      status: "skipped",
      details: "Biografia e campos ligados ao nome continuam sob controle do usuário."
    }
  ]
};

export function createDemoStepState(activeStepId: OrcidV2StepId): OrcidV2Step[] {
  return demoV2Steps.map((step) => ({
    ...step,
    state:
      step.id === activeStepId
        ? "active"
        : demoV2Steps.findIndex((candidate) => candidate.id === step.id) <
            demoV2Steps.findIndex((candidate) => candidate.id === activeStepId)
          ? "complete"
          : step.state
  }));
}
