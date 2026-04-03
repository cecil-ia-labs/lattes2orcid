import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction
} from "react";
import styled from "styled-components";
import {
  OrcidV2Wizard,
  type OrcidV2Artifact,
  type OrcidV2CoverageItem,
  type OrcidV2ManualAction,
  type OrcidV2MetaPanel,
  type OrcidV2ReviewSection,
  type OrcidV2Step,
  type OrcidV2StepId,
  type OrcidV2SyncReport
} from "@/components/v2";
import {
  buildOrcidImportPlanFromBytes,
  ORCID_SCOPES,
  type OrcidImportPlan
} from "@/lib/orcid";
import { exchangeAuthorizationCode, fetchOrcidRecord, syncDraftSections } from "@/lib/orcid/api";
import { buildOrcidAuthorizeUrl, getOrcidGatewayConfig } from "@/lib/orcid/contracts";
import { detectXmlEncoding } from "@/lib/lattes/normalize";
import type {
  OrcidManualAction as DomainManualAction,
  OrcidSectionDraft,
  OrcidSectionType,
  OrcidSessionState,
  OrcidSyncReport
} from "@/lib/orcid/types";

type NoticeTone = "info" | "success" | "warning" | "danger";

interface NoticeState {
  tone: NoticeTone;
  message: string;
}

interface ReviewGroupDefinition {
  id: string;
  title: string;
  endpoint: string;
  sectionTypes: OrcidSectionType[];
}

const REVIEW_GROUPS: ReviewGroupDefinition[] = [
  {
    id: "works",
    title: "Produções",
    endpoint: "/section/works",
    sectionTypes: ["works"]
  },
  {
    id: "education",
    title: "Formação e titulação",
    endpoint: "/section/education",
    sectionTypes: ["education", "qualification"]
  },
  {
    id: "affiliations",
    title: "Vínculos e afiliações",
    endpoint: "/section/employment",
    sectionTypes: ["employment", "invited-position", "membership", "service"]
  },
  {
    id: "distinctions",
    title: "Distinções",
    endpoint: "/section/distinction",
    sectionTypes: ["distinction"]
  },
  {
    id: "profile",
    title: "Metadados do perfil",
    endpoint: "/section/address",
    sectionTypes: ["keywords", "researcher-urls", "external-identifiers", "address"]
  }
];

const STEP_META: Record<OrcidV2StepId, Omit<OrcidV2Step, "state">> = {
  upload: {
    id: "upload",
    label: "01",
    title: "Envio",
    summary: "Carregue o XML do Lattes e prepare o plano só em memória."
  },
  coverage: {
    id: "coverage",
    label: "02",
    title: "Cobertura",
    summary: "Veja o que entra em auto-sync, o que pede revisão e o que fica manual."
  },
  oauth: {
    id: "oauth",
    label: "03",
    title: "Login ORCID",
    summary: "Autentique o ORCID iD somente via OAuth."
  },
  consent: {
    id: "consent",
    label: "04",
    title: "Consentimento",
    summary: "Revise escopos, gateway e ownership antes da escrita."
  },
  review: {
    id: "review",
    label: "05",
    title: "Revisão",
    summary: "Revise o diff por domínio antes de sincronizar."
  },
  manual: {
    id: "manual",
    label: "06",
    title: "Fila manual",
    summary: "Biografia, nomes, e-mails e conflitos ficam fora do auto-sync."
  },
  sync: {
    id: "sync",
    label: "07",
    title: "Sincronização",
    summary: "Envie apenas os itens elegíveis pelo gateway da ORCID."
  },
  report: {
    id: "report",
    label: "08",
    title: "Relatório",
    summary: "Veja o que foi enviado, retido ou bloqueado."
  }
};

const EMPTY_SYNC_REPORT: OrcidV2SyncReport = {
  state: "idle",
  progress: 0,
  total: 0,
  items: [],
  message: "Envie um XML do Lattes para montar o plano de sincronização com a ORCID."
};

export function OrcidV2Page() {
  const [activeStepId, setActiveStepId] = useState<OrcidV2StepId>("upload");
  const [artifact, setArtifact] = useState<OrcidV2Artifact>();
  const [plan, setPlan] = useState<OrcidImportPlan | null>(null);
  const [notice, setNotice] = useState<NoticeState>();
  const [handledCode, setHandledCode] = useState<string | null>(null);
  const [manualStatuses, setManualStatuses] = useState<
    Record<string, OrcidV2ManualAction["status"]>
  >({});
  const [syncReport, setSyncReport] = useState<OrcidV2SyncReport>(EMPTY_SYNC_REPORT);
  const [session, setSession] = useState<OrcidSessionState>({
    grantedScopes: [],
    draftSections: [],
    manualQueue: [],
    putCodes: {
      entries: []
    }
  });
  const [, startTransition] = useTransition();

  const xmlBytesRef = useRef<ArrayBuffer | null>(null);
  const xmlFilenameRef = useRef<string | null>(null);
  const syncAttemptKeyRef = useRef<string | null>(null);

  const config = useMemo(() => getOrcidGatewayConfig(), []);
  const authorizeUrl = useMemo(() => buildOrcidAuthorizeUrl(config), [config]);

  const identity = useMemo(
    () => ({
      connected: Boolean(session.authenticatedOrcidUri),
      sandbox: config.sandboxBaseUrl.includes("sandbox"),
      orcidUri: session.authenticatedOrcidUri,
      displayName: session.orcidName,
      tokenSummary: session.accessToken
        ? "Token OAuth ativo apenas durante esta sessão do navegador."
        : undefined,
      scopes: session.grantedScopes.length > 0 ? session.grantedScopes : [...ORCID_SCOPES]
    }),
    [config.sandboxBaseUrl, session.accessToken, session.authenticatedOrcidUri, session.grantedScopes, session.orcidName]
  );

  const consentScopes = useMemo(
    () =>
      ORCID_SCOPES.map((scope) => ({
        scope,
        label: getScopeLabel(scope),
        granted: session.grantedScopes.includes(scope),
        mandatory: true
      })),
    [session.grantedScopes]
  );

  const coverage = useMemo(
    () => buildCoverageItems(session.draftSections, session.manualQueue),
    [session.draftSections, session.manualQueue]
  );

  const reviewSections = useMemo(
    () => buildReviewSections(session.draftSections),
    [session.draftSections]
  );

  const manualQueue = useMemo(
    () => buildUiManualQueue(session.manualQueue, manualStatuses),
    [manualStatuses, session.manualQueue]
  );

  const steps = useMemo(
    () =>
      buildSteps(activeStepId, {
        hasArtifact: Boolean(artifact),
        planReady: Boolean(plan),
        connected: identity.connected,
        hasReview: reviewSections.some((section) => section.status === "review-required"),
        hasManual: manualQueue.some((item) => item.status !== "done"),
        syncState: syncReport.state
      }),
    [activeStepId, artifact, identity.connected, manualQueue, plan, reviewSections, syncReport.state]
  );

  const metaPanels = useMemo<OrcidV2MetaPanel[]>(
    () => [
      {
        id: "current-session",
        title: "Sessão atual",
        summary: plan
          ? `${plan.drafts.length} rascunhos · ${manualQueue.length} itens manuais`
          : "Aguardando XML e login ORCID",
        items: [
          {
            label: "Plano",
            value: plan ? `${plan.drafts.length} seções prontas` : "Aguardando XML"
          },
          {
            label: "Fila manual",
            value: `${manualQueue.length} itens`
          },
          {
            label: "ORCID iD",
            value: identity.orcidUri ?? "Não autenticado"
          },
          {
            label: "Escopos",
            value: identity.scopes.join(", ")
          }
        ]
      },
      {
        id: "review-rules",
        title: "Regras de revisão",
        summary: "4 regras para privacidade, ownership e sync automático.",
        bullets: [
          "Biografia, nomes e e-mails continuam apenas na fila manual.",
          "Só rascunhos em auto-sync entram na etapa de sincronização.",
          "Itens de outra source não entram em mutação automática.",
          "O navegador não persiste XML, diff nem tokens além da sessão."
        ]
      }
    ],
    [identity.orcidUri, identity.scopes, manualQueue.length, plan]
  );

  useEffect(() => {
    if (!config.gatewayUrl || !config.clientId || !config.redirectUri) {
      setNotice((current) =>
        current ?? {
          tone: "warning",
          message:
            "Configure VITE_ORCID_GATEWAY_URL, VITE_ORCID_CLIENT_ID e VITE_ORCID_REDIRECT_URI antes de sair do navegador para o OAuth."
        }
      );
    }
  }, [config.clientId, config.gatewayUrl, config.redirectUri]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setNotice({
        tone: "danger",
        message: "O OAuth da ORCID retornou um erro ou a autenticação foi cancelada."
      });
      setActiveStepId("oauth");
      replaceOAuthQueryParams(params);
      return;
    }

    if (!code || !config.redirectUri || code === handledCode) {
      return;
    }

    const redirectUri = config.redirectUri;
    let cancelled = false;
    setHandledCode(code);

    void (async () => {
      try {
        const response = await exchangeAuthorizationCode(config.gatewayUrl, {
          code,
          redirectUri,
          scopes: [...ORCID_SCOPES]
        });

        const snapshot =
          response.accessToken && config.gatewayUrl
            ? await fetchOrcidRecord(config.gatewayUrl, response.accessToken)
            : undefined;

        const rebuiltPlan =
          xmlBytesRef.current && xmlFilenameRef.current
            ? await buildOrcidImportPlanFromBytes(
                xmlBytesRef.current.slice(0),
                xmlFilenameRef.current,
                snapshot
              )
            : null;

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSession((current) => ({
            ...current,
            authenticatedOrcidUri: response.authenticatedOrcidUri,
            orcidName: response.orcidName,
            grantedScopes: response.grantedScopes,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            recordSnapshot: snapshot
          }));

          if (rebuiltPlan) {
            applyImportPlanState(
              rebuiltPlan,
              setPlan,
              setSession,
              setManualStatuses,
              setSyncReport
            );
          }

          setNotice({
            tone: "success",
            message:
              "Sessão ORCID autenticada. O retrato atual do registro já foi incorporado ao diff."
          });
          setActiveStepId(rebuiltPlan ? "consent" : "oauth");
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[orcid-v2] Failed to exchange the authorization code.", error);
        setNotice({
          tone: "danger",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível concluir o callback de autenticação da ORCID."
        });
        setActiveStepId("oauth");
      } finally {
        replaceOAuthQueryParams(params);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.gatewayUrl, config.redirectUri, handledCode, startTransition]);

  useEffect(() => {
    if (activeStepId !== "sync" || session.draftSections.length === 0) {
      return;
    }

    const attemptKey = [
      artifact?.parsedAt ?? "no-artifact",
      session.authenticatedOrcidUri ?? "no-session",
      session.draftSections.length,
      session.accessToken ? "token" : "no-token"
    ].join(":");

    if (syncAttemptKeyRef.current === attemptKey) {
      return;
    }

    syncAttemptKeyRef.current = attemptKey;
    const currentManualQueue = manualQueue;
    const syncableDrafts = getSyncableDrafts(session.draftSections);

    if (syncableDrafts.length === 0) {
      setSyncReport(
        buildCompletedSyncReport(syncableDrafts, currentManualQueue, session.syncReport)
      );
      setNotice({
        tone: "warning",
        message: "Ainda não há itens elegíveis para auto-sync. Revise as seções retidas antes de executar a escrita."
      });
      return;
    }

    setSyncReport(buildSyncingReport(syncableDrafts, currentManualQueue));

    if (!config.gatewayUrl || !session.accessToken || !session.authenticatedOrcidUri) {
      setSyncReport(
        buildErroredSyncReport(
          syncableDrafts,
          currentManualQueue,
          "O navegador só pode entregar operações de escrita quando houver OAuth autenticado e gateway configurado."
        )
      );
      setNotice({
        tone: "warning",
        message:
          "A sincronização fica bloqueada até existir uma sessão ORCID autenticada e uma URL de gateway válida."
      });
      return;
    }

    void (async () => {
      try {
        const report = await syncDraftSections(
          config.gatewayUrl,
          syncableDrafts.map((draft) => ({
            accessToken: session.accessToken as string,
            draft
          }))
        );

        setSession((current) => ({
          ...current,
          syncReport: report
        }));
        setSyncReport(buildCompletedSyncReport(syncableDrafts, currentManualQueue, report));
        setNotice({
          tone: "success",
          message:
            "A escrita automática na ORCID foi concluída. Itens manuais e os que pedem revisão continuam retidos."
        });
        setActiveStepId("report");
      } catch (error) {
        console.error("[orcid-v2] Failed to synchronize draft sections.", error);
        setSyncReport(
          buildErroredSyncReport(
            syncableDrafts,
            currentManualQueue,
            error instanceof Error ? error.message : "A tentativa de sincronização com a ORCID falhou."
          )
        );
        setNotice({
          tone: "danger",
          message:
            error instanceof Error ? error.message : "A tentativa de sincronização com a ORCID falhou."
        });
      }
    })();
  }, [
    activeStepId,
    artifact?.parsedAt,
    config.gatewayUrl,
    manualQueue,
    session.accessToken,
    session.authenticatedOrcidUri,
    session.draftSections,
    session.syncReport
  ]);

  async function handleUploadSelect(file: File | null) {
    if (!file) {
      xmlBytesRef.current = null;
      xmlFilenameRef.current = null;
      syncAttemptKeyRef.current = null;
      setArtifact(undefined);
      setPlan(null);
      setManualStatuses({});
      setSyncReport(EMPTY_SYNC_REPORT);
      setSession((current) => ({
        ...current,
        draftSections: [],
        manualQueue: [],
        syncReport: undefined
      }));
      setNotice({
        tone: "info",
        message: "O plano XML mantido em memória foi limpo."
      });
      setActiveStepId("upload");
      return;
    }

    setNotice({
      tone: "info",
      message: "Lendo o XML do Lattes localmente e reconstruindo o plano de rascunhos para a ORCID."
    });

    try {
      const buffer = await file.arrayBuffer();
      const encoding = detectXmlEncoding(buffer);
      const nextPlan = await buildOrcidImportPlanFromBytes(
        buffer,
        file.name,
        session.recordSnapshot
      );

      xmlBytesRef.current = buffer.slice(0);
      xmlFilenameRef.current = file.name;
      syncAttemptKeyRef.current = null;

      startTransition(() => {
        setArtifact({
          name: file.name,
          sizeBytes: file.size,
          encoding,
          parsedAt: new Date().toISOString(),
          sourceLabel: "Lattes XML"
        });
        applyImportPlanState(nextPlan, setPlan, setSession, setManualStatuses, setSyncReport);
        setNotice({
          tone: "success",
          message: `XML lido com sucesso. ${nextPlan.drafts.length} seções de rascunho e ${nextPlan.manualQueue.length} ações manuais já podem ser revisadas.`
        });
        setActiveStepId("coverage");
      });
    } catch (error) {
      console.error("[orcid-v2] Failed to parse the selected XML.", error);
      setNotice({
        tone: "danger",
        message:
          error instanceof Error
            ? error.message
            : "O XML selecionado não pôde ser lido para o fluxo ORCID."
      });
      setActiveStepId("upload");
    }
  }

  function handleAuthorize() {
    if (!authorizeUrl) {
      setNotice({
        tone: "warning",
        message:
          "Ainda não foi possível montar a URL de autorização da ORCID. Verifique client ID, redirect URI e gateway."
      });
      setActiveStepId("oauth");
      return;
    }

    setNotice({
      tone: "info",
      message: "Redirecionando para o OAuth da ORCID. O plano do XML continua apenas na memória desta sessão."
    });
    window.location.assign(authorizeUrl);
  }

  function handlePrimaryAction(actionId: string) {
    if (actionId === "consent") {
      setActiveStepId("review");
      return;
    }

    if (actionId.startsWith("review:") && actionId.endsWith(":manual")) {
      setNotice({
        tone: "warning",
        message: "Este domínio permanece na fila manual até a pessoa confirmar os itens."
      });
      setActiveStepId("manual");
      return;
    }

    if (actionId.startsWith("review:") && actionId.endsWith(":sync")) {
      setNotice({
        tone: "info",
        message: "Este domínio está elegível para a etapa de sincronização automática."
      });
      setActiveStepId("sync");
      return;
    }

    if (actionId.startsWith("review:") && actionId.endsWith(":inspect")) {
      setNotice({
        tone: "info",
        message: "Inspecione o resumo do domínio antes de decidir se ele continua automático ou manual."
      });
    }
  }

  function handleManualAction(actionId: string, nextStatus: OrcidV2ManualAction["status"]) {
    setManualStatuses((current) => ({
      ...current,
      [actionId]: nextStatus
    }));
  }

  return (
    <PageShell data-testid="orcid-v2-page">
      <IntroGrid>
        <IntroCard>
          <Eyebrow>V2 em sandbox, sem retenção de currículo</Eyebrow>
          <Title>Lattes2ORCID v2</Title>
          <Lead>
            Envie o XML, revise o que pode entrar no ORCID e autorize a escrita só
            quando tudo estiver claro. O currículo fica apenas nesta sessão do navegador.
          </Lead>
          <ChipRow>
            <Chip>identidade via OAuth</Chip>
            <Chip>fila manual explícita</Chip>
            <Chip>diff com ownership</Chip>
          </ChipRow>
        </IntroCard>

        <SupportCard>
          <CardTitle>Identidade ORCID</CardTitle>
          <SupportBodyText>
            A identidade usada na sincronização sempre vem do login oficial da ORCID.
          </SupportBodyText>
          <DetailList>
            <DetailRow>
              <DetailKey>Perfil</DetailKey>
              <DetailValue>{identity.displayName ?? "Aguardando autenticação"}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailKey>ORCID iD</DetailKey>
              <DetailValue>{identity.orcidUri ?? "Sem conexão"}</DetailValue>
            </DetailRow>
          </DetailList>
          <SupportSection>
            <DetailKey>Escopos</DetailKey>
            <IdentityChipRow>
              {identity.scopes.map((scope) => (
                <IdentityChip key={scope}>{scope}</IdentityChip>
              ))}
            </IdentityChipRow>
          </SupportSection>
          {identity.tokenSummary ? <SupportBodyText>{identity.tokenSummary}</SupportBodyText> : null}
          <SupportActions>
            <SupportButton type="button" onClick={handleAuthorize}>
              {identity.connected ? "Atualizar login ORCID" : "Conectar ORCID"}
            </SupportButton>
            <SupportLink href="/lattes2orcid/">Abrir a v1 atual</SupportLink>
          </SupportActions>
        </SupportCard>
      </IntroGrid>

      {notice ? <NoticeCard data-tone={notice.tone}>{notice.message}</NoticeCard> : null}

      <WizardFrame>
        <OrcidV2Wizard
          steps={steps}
          activeStepId={activeStepId}
          artifact={artifact}
          coverage={coverage}
          identity={identity}
          consentScopes={consentScopes}
          reviewSections={reviewSections}
          manualQueue={manualQueue}
          syncReport={syncReport}
          metaPanels={metaPanels}
          onStepChange={setActiveStepId}
          onUploadSelect={handleUploadSelect}
          onAuthorize={handleAuthorize}
          onPrimaryAction={handlePrimaryAction}
          onManualAction={handleManualAction}
        />
      </WizardFrame>
    </PageShell>
  );
}

function applyImportPlanState(
  nextPlan: OrcidImportPlan,
  setPlan: Dispatch<SetStateAction<OrcidImportPlan | null>>,
  setSession: Dispatch<SetStateAction<OrcidSessionState>>,
  setManualStatuses: Dispatch<SetStateAction<Record<string, OrcidV2ManualAction["status"]>>>,
  setSyncReport: Dispatch<SetStateAction<OrcidV2SyncReport>>
) {
  setPlan(nextPlan);
  setSession((current) => ({
    ...current,
    draftSections: nextPlan.drafts,
    manualQueue: nextPlan.manualQueue,
    syncReport: nextPlan.report
  }));
  setManualStatuses((current) =>
    nextPlan.manualQueue.reduce<Record<string, OrcidV2ManualAction["status"]>>((result, action) => {
      const id = buildManualActionId(action);
      result[id] = current[id] ?? "queued";
      return result;
    }, {})
  );
  setSyncReport(buildIdleSyncReport(nextPlan.drafts, nextPlan.manualQueue));
}

function buildSteps(
  activeStepId: OrcidV2StepId,
  context: {
    hasArtifact: boolean;
    planReady: boolean;
    connected: boolean;
    hasReview: boolean;
    hasManual: boolean;
    syncState: OrcidV2SyncReport["state"];
  }
): OrcidV2Step[] {
  const order: OrcidV2StepId[] = [
    "upload",
    "coverage",
    "oauth",
    "consent",
    "review",
    "manual",
    "sync",
    "report"
  ];

  return order.map((stepId) => {
    if (stepId === activeStepId) {
      return {
        ...STEP_META[stepId],
        state: "active"
      };
    }

    switch (stepId) {
      case "upload":
        return { ...STEP_META[stepId], state: context.hasArtifact ? "complete" : "pending" };
      case "coverage":
        return { ...STEP_META[stepId], state: context.planReady ? "complete" : "pending" };
      case "oauth":
      case "consent":
        return {
          ...STEP_META[stepId],
          state: context.connected ? "complete" : "pending"
        };
      case "review":
        return {
          ...STEP_META[stepId],
          state: context.hasReview ? "attention" : context.planReady ? "complete" : "pending"
        };
      case "manual":
        return {
          ...STEP_META[stepId],
          state: context.hasManual ? "attention" : context.planReady ? "complete" : "pending"
        };
      case "sync":
        return {
          ...STEP_META[stepId],
          state:
            context.syncState === "complete"
              ? "complete"
              : context.syncState === "error"
                ? "attention"
                : "pending"
        };
      case "report":
        return {
          ...STEP_META[stepId],
          state: context.syncState === "complete" ? "complete" : "pending"
        };
    }

    return { ...STEP_META.upload, state: "pending" };
  });
}

function buildCoverageItems(
  drafts: OrcidSectionDraft[],
  manualQueue: DomainManualAction[]
): OrcidV2CoverageItem[] {
  const items: Array<OrcidV2CoverageItem | null> = REVIEW_GROUPS.map((group): OrcidV2CoverageItem | null => {
    const groupDrafts = drafts.filter((draft) => group.sectionTypes.includes(draft.sectionType));
    if (groupDrafts.length === 0) {
      return null;
    }

    const reviewCount = groupDrafts.filter((draft) => draft.status === "review-required").length;
    const skipCount = groupDrafts.filter((draft) => draft.action === "skip").length;

    return {
      id: group.id,
      label: group.title,
      count: groupDrafts.length,
      status: reviewCount > 0 || skipCount > 0 ? "review-required" : "auto-sync",
      note: buildCoverageNote(groupDrafts, group.endpoint)
    } satisfies OrcidV2CoverageItem;
  });

  const normalizedItems = items.filter(
    (item): item is OrcidV2CoverageItem => item !== null
  );

  if (manualQueue.length > 0) {
    normalizedItems.push({
      id: "manual",
      label: "Somente manual",
      count: manualQueue.length,
      status: "manual-only",
      note: "Biografia, identidade, e-mails e mapeamentos ambíguos ficam fora da escrita automática."
    });
  }

  if (normalizedItems.length === 0) {
    return [
      {
        id: "awaiting-xml",
        label: "Aguardando XML",
        count: 0,
        status: "warning",
        note: "Envie um XML do Lattes para preencher a matriz de cobertura da ORCID."
      }
    ];
  }

  return normalizedItems;
}

function buildReviewSections(drafts: OrcidSectionDraft[]): OrcidV2ReviewSection[] {
  const sections: Array<OrcidV2ReviewSection | null> = REVIEW_GROUPS.map(
    (group): OrcidV2ReviewSection | null => {
    const groupDrafts = drafts.filter((draft) => group.sectionTypes.includes(draft.sectionType));

    if (groupDrafts.length === 0) {
      return null;
    }

    const reviewCount = groupDrafts.filter((draft) => draft.status === "review-required").length;
    const autoCount = groupDrafts.filter((draft) => draft.status === "auto-sync").length;
    const foreignCount = groupDrafts.filter((draft) => draft.ownershipState === "foreign").length;

    return {
      id: group.id,
      title: group.title,
      endpoint: group.endpoint,
      status: reviewCount > 0 || foreignCount > 0 ? "review-required" : "auto-sync",
      summary: buildReviewSummary(groupDrafts, autoCount, reviewCount, foreignCount),
      count: groupDrafts.length,
      actions: [
        {
          id: `review:${group.id}:inspect`,
          label: "Inspecionar seção",
          tone: "secondary"
        },
        reviewCount > 0 || foreignCount > 0
          ? {
              id: `review:${group.id}:manual`,
              label: "Abrir fila manual",
              tone: "danger"
            }
          : {
              id: `review:${group.id}:sync`,
              label: "Enviar para o sync",
              tone: "primary"
            }
      ]
    } satisfies OrcidV2ReviewSection;
  });

  const normalizedSections = sections.filter(
    (section): section is OrcidV2ReviewSection => section !== null
  );

  if (normalizedSections.length === 0) {
    return [
      {
        id: "awaiting-review",
        title: "Nenhuma seção pronta ainda",
        endpoint: "/section",
        status: "warning",
        summary: "Envie um XML do Lattes antes de montar a matriz de revisão.",
        count: 0,
        actions: [
          {
            id: "review:awaiting:inspect",
            label: "Enviar XML",
            tone: "secondary"
          }
        ]
      }
    ];
  }

  return normalizedSections;
}

function buildUiManualQueue(
  manualQueue: DomainManualAction[],
  statuses: Record<string, OrcidV2ManualAction["status"]>
): OrcidV2ManualAction[] {
  return manualQueue.map((item) => {
    const id = buildManualActionId(item);
    return {
      id,
      title: item.title,
      reason: item.reason,
      source: item.sourceContext.sourceLabel,
      endpoint: item.sectionType,
      suggestion: item.suggestedResolution,
      status: statuses[id] ?? "queued"
    };
  });
}

function buildManualActionId(action: DomainManualAction): string {
  return `${action.sectionType}:${action.sourceContext.sourceFingerprint}`;
}

function getSyncableDrafts(drafts: OrcidSectionDraft[]): OrcidSectionDraft[] {
  return drafts.filter(
    (draft) =>
      draft.status === "auto-sync" &&
      draft.action !== "skip" &&
      draft.action !== "manual"
  );
}

function buildIdleSyncReport(
  drafts: OrcidSectionDraft[],
  manualQueue: DomainManualAction[]
): OrcidV2SyncReport {
  const syncableDrafts = getSyncableDrafts(drafts);
  return {
    state: "idle",
    progress: 0,
    total: syncableDrafts.length,
    items: [
      ...syncableDrafts.map((draft) => ({
        id: buildDraftId(draft),
        title: getSectionTypeLabel(draft.sectionType),
        endpoint: draft.endpoint,
        status: "pending" as const,
        details: draft.reason
      })),
      ...manualQueue.map((item) => ({
        id: buildManualActionId(item),
        title: item.title,
        endpoint: item.sectionType,
        status: "skipped" as const,
        details: item.reason
      }))
    ],
    message:
      syncableDrafts.length > 0
        ? "As seções automáticas já estão preparadas, mas ainda não foram enviadas."
        : "Ainda não há escritas automáticas prontas para a ORCID."
  };
}

function buildSyncingReport(
  drafts: OrcidSectionDraft[],
  manualQueue: OrcidV2ManualAction[]
): OrcidV2SyncReport {
  return {
    state: "syncing",
    progress: 18,
    total: drafts.length,
    items: [
      ...drafts.map((draft) => ({
        id: buildDraftId(draft),
        title: getSectionTypeLabel(draft.sectionType),
        endpoint: draft.endpoint,
        status: "pending" as const,
        details: draft.reason
      })),
      ...manualQueue.map((item) => ({
        id: item.id,
        title: item.title,
        endpoint: item.endpoint ?? item.source,
        status: "skipped" as const,
        details: item.reason
      }))
    ],
    message: "Enviando os rascunhos elegíveis pelo gateway da ORCID."
  };
}

function buildCompletedSyncReport(
  drafts: OrcidSectionDraft[],
  manualQueue: OrcidV2ManualAction[],
  report?: OrcidSyncReport
): OrcidV2SyncReport {
  return {
    state: "complete",
    progress: drafts.length > 0 ? 100 : 0,
    total: drafts.length,
    items: [
      ...drafts.map((draft) => ({
        id: buildDraftId(draft),
        title: getSectionTypeLabel(draft.sectionType),
        endpoint: draft.endpoint,
        status: "success" as const,
        details: draft.reason
      })),
      ...manualQueue.map((item) => ({
        id: item.id,
        title: item.title,
        endpoint: item.endpoint ?? item.source,
        status: "skipped" as const,
        details: item.reason
      }))
    ],
    message: report
      ? `${report.created} criados, ${report.updated} atualizados, ${report.skipped} ignorados e ${report.manual + report.failed} retidos para revisão.`
      : "A sincronização terminou sem mutações enviadas pelo gateway."
  };
}

function buildErroredSyncReport(
  drafts: OrcidSectionDraft[],
  manualQueue: OrcidV2ManualAction[],
  message: string
): OrcidV2SyncReport {
  return {
    state: "error",
    progress: 0,
    total: drafts.length,
    items: [
      ...drafts.map((draft) => ({
        id: buildDraftId(draft),
        title: getSectionTypeLabel(draft.sectionType),
        endpoint: draft.endpoint,
        status: "failure" as const,
        details: draft.reason
      })),
      ...manualQueue.map((item) => ({
        id: item.id,
        title: item.title,
        endpoint: item.endpoint ?? item.source,
        status: "skipped" as const,
        details: item.reason
      }))
    ],
    message
  };
}

function buildDraftId(draft: OrcidSectionDraft): string {
  return `${draft.sectionType}:${draft.sourceContext.sourceFingerprint}`;
}

function getScopeLabel(scope: (typeof ORCID_SCOPES)[number]): string {
  switch (scope) {
    case "/read-limited":
      return "Leitura limitada";
    case "/activities/update":
      return "Atualizar atividades";
    case "/person/update":
      return "Atualizar dados pessoais";
    default:
      return scope;
  }
}

function getSectionTypeLabel(sectionType: string): string {
  switch (sectionType) {
    case "works":
      return "Produções";
    case "education":
      return "Formação";
    case "qualification":
      return "Qualificações";
    case "employment":
      return "Vínculos";
    case "invited-position":
      return "Posições como visitante";
    case "membership":
      return "Associações e memberships";
    case "service":
      return "Serviços";
    case "distinction":
      return "Distinções";
    case "keywords":
      return "Palavras-chave";
    case "researcher-urls":
      return "Links do pesquisador";
    case "external-identifiers":
      return "Identificadores externos";
    case "address":
      return "Endereço";
    case "biography":
      return "Biografia";
    case "identity":
      return "Identidade";
    case "email":
      return "E-mails";
    default:
      return sectionType;
  }
}

function buildCoverageNote(drafts: OrcidSectionDraft[], endpoint: string): string {
  const autoCount = drafts.filter((draft) => draft.status === "auto-sync").length;
  const reviewCount = drafts.filter((draft) => draft.status === "review-required").length;
  const foreignCount = drafts.filter((draft) => draft.ownershipState === "foreign").length;
  const parts = [
    autoCount > 0 ? `${autoCount} em auto-sync` : "",
    reviewCount > 0 ? `${reviewCount} pedem revisão` : "",
    foreignCount > 0 ? `${foreignCount} conflitam com outra source` : ""
  ].filter(Boolean);

  return parts.length > 0
    ? `${parts.join(" · ")} via ${endpoint}.`
    : `Preparado para ${endpoint}.`;
}

function buildReviewSummary(
  drafts: OrcidSectionDraft[],
  autoCount: number,
  reviewCount: number,
  foreignCount: number
): string {
  const parts = [
    autoCount > 0 ? `${autoCount} prontos para sincronização automática` : "",
    reviewCount > 0 ? `${reviewCount} aguardando confirmação` : "",
    foreignCount > 0 ? `${foreignCount} já pertencem a outra source da ORCID` : ""
  ].filter(Boolean);

  return parts.length > 0
    ? `${parts.join(". ")}.`
    : `${drafts.length} itens preparados para revisão.`;
}

function replaceOAuthQueryParams(params: URLSearchParams) {
  params.delete("code");
  params.delete("state");
  params.delete("error");
  const nextSearch = params.toString();
  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`
  );
}

const PageShell = styled.main`
  padding: 28px;

  @media (max-width: 760px) {
    padding: 16px;
  }
`;

const IntroGrid = styled.section`
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr);
  margin-bottom: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const IntroCard = styled.article`
  padding: 28px;
  border: 1px solid rgba(16, 22, 31, 0.08);
  border-radius: 28px;
  background: rgba(255, 250, 241, 0.82);
  box-shadow: 0 18px 40px rgba(16, 22, 31, 0.08);
`;

const SupportCard = styled.aside`
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid rgba(16, 22, 31, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 34px rgba(16, 22, 31, 0.08);
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(16, 22, 31, 0.6);
`;

const Title = styled.h1`
  margin: 0;
  font-family: var(--font-heading), sans-serif;
  font-size: clamp(2.4rem, 4vw, 4.6rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
`;

const Lead = styled.p`
  margin: 18px 0 0;
  max-width: 58rem;
  font-size: 1.02rem;
  line-height: 1.7;
  color: rgba(16, 22, 31, 0.8);
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(199, 243, 235, 0.72);
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
`;

const NoticeCard = styled.div`
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(16, 22, 31, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: #10161f;

  &[data-tone="success"] {
    background: rgba(199, 243, 235, 0.76);
    color: #0a5f57;
  }

  &[data-tone="warning"] {
    background: rgba(255, 232, 187, 0.72);
    color: #7c5714;
  }

  &[data-tone="danger"] {
    background: rgba(255, 216, 201, 0.84);
    color: #8a3724;
  }
`;

const WizardFrame = styled.div`
  border-radius: 38px;
  overflow: hidden;
  box-shadow: 0 22px 60px rgba(16, 22, 31, 0.12);
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
`;

const SupportBodyText = styled.p`
  margin: 0;
  line-height: 1.6;
  color: rgba(16, 22, 31, 0.76);
`;

const DetailList = styled.div`
  display: grid;
  gap: 10px;
`;

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  font-size: 0.95rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const DetailKey = styled.span`
  color: rgba(16, 22, 31, 0.58);
`;

const DetailValue = styled.span`
  color: #10161f;
  word-break: break-word;
`;

const SupportSection = styled.div`
  display: grid;
  gap: 10px;
`;

const IdentityChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const IdentityChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(199, 243, 235, 0.42);
  border: 1px solid rgba(15, 118, 110, 0.14);
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 700;
`;

const SupportActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

const SupportButton = styled.button`
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #0f766e, #0a5b55);
  color: #fffaf1;
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 16px 32px rgba(15, 118, 110, 0.22);
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid rgba(15, 118, 110, 0.28);
    outline-offset: 2px;
  }
`;

const SupportLink = styled.a`
  display: inline-flex;
  color: #0f766e;
  font-weight: 700;
`;
