import type { OrcidV2StepId, OrcidV2WizardProps } from "@/components/v2/types";
import { useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

const drift = keyframes`
  from {
    transform: translateY(10px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const COVERAGE_LABELS: Record<string, string> = {
  works: "Produções",
  education: "Formação",
  employment: "Vínculos",
  affiliations: "Vínculos",
  qualification: "Qualificações",
  membership: "Associações",
  service: "Serviços",
  "invited-position": "Posições convidadas",
  distinction: "Distinções",
  distinctions: "Distinções",
  profile: "Perfil",
  keywords: "Palavras-chave",
  "researcher-urls": "Links do pesquisador",
  "external-identifiers": "Identificadores externos",
  address: "Endereço",
  manual: "Somente manual",
  "awaiting-xml": "Aguardando XML"
};

const STEP_TITLES: Record<OrcidV2StepId, string> = {
  upload: "Carregar XML",
  coverage: "Cobertura",
  oauth: "Login com ORCID",
  consent: "Consentimento",
  review: "Revisão",
  manual: "Fila manual",
  sync: "Sincronização",
  report: "Relatório"
};

const STEP_SUMMARIES: Record<OrcidV2StepId, string> = {
  upload: "Carregue o XML do Lattes e faça a leitura local em memória.",
  coverage: "Veja o que pode seguir automaticamente, o que exige revisão e o que fica manual.",
  oauth: "Autentique o ORCID iD exclusivamente via OAuth.",
  consent: "Confirme escopos, privacidade e regras de origem dos dados antes do envio.",
  review: "Revise a comparação por domínio antes de liberar a sincronização.",
  manual: "Campos sensíveis, ambíguos ou reservados ao pesquisador ficam aqui.",
  sync: "Envie somente itens elegíveis pelo gateway ORCID.",
  report: "Confira o que foi enviado, retido ou mantido para revisão."
};

const SCOPE_LABELS: Record<string, string> = {
  "/read-limited": "Leitura do registro",
  "/activities/update": "Atualização de atividades",
  "/person/update": "Atualização de dados pessoais"
};

const REVIEW_SECTION_LABELS: Record<string, string> = {
  works: "Produções",
  education: "Formação e qualificações",
  affiliations: "Vínculos e afiliações",
  distinctions: "Distinções",
  profile: "Metadados do perfil",
  "awaiting-review": "Nenhuma seção pronta ainda"
};

const MANUAL_STATUS_LABELS = {
  queued: "Na fila",
  "in-review": "Em revisão",
  done: "Concluído"
} as const;

const SYNC_STATE_LABELS = {
  idle: "Aguardando",
  syncing: "Sincronizando",
  complete: "Concluído",
  error: "Erro"
} as const;

const SYNC_ITEM_STATUS_LABELS = {
  pending: "Pendente",
  success: "Concluído",
  failure: "Falhou",
  skipped: "Ignorado"
} as const;

const SYNC_MESSAGE_LABELS: Record<string, string> = {
  "Automatic sections are prepared but not yet sent.":
    "As seções automáticas já foram preparadas, mas ainda não foram enviadas.",
  "No automatic ORCID writes are ready yet.":
    "Ainda não há envios automáticos prontos no ORCID.",
  "Writing auto-sync drafts through the ORCID gateway.":
    "Enviando rascunhos elegíveis pelo gateway ORCID.",
  "The sync step completed without gateway mutations.":
    "A sincronização terminou sem operações de escrita pelo gateway."
};

const FOOTER_LINKS = [
  { href: "https://cecilialabs.com", label: "Cecil-IA Labs" },
  { href: "https://github.com/cecil-ia-labs/lattes2orcid", label: "GitHub" },
  { href: "https://lattes.cnpq.br", label: "Plataforma Lattes" },
  { href: "https://www.gov.br/cnpq/pt-br", label: "CNPq" },
  { href: "https://orcid.org", label: "ORCID" }
] as const;

function formatStepCounter(value: number) {
  return String(value).padStart(2, "0");
}

function getCoverageLabel(id: string, fallback: string) {
  return COVERAGE_LABELS[id] ?? fallback;
}

function getEntityLabel(id: string, fallback: string) {
  return COVERAGE_LABELS[id] ?? REVIEW_SECTION_LABELS[id] ?? fallback;
}

function getStepTitle(stepId: OrcidV2StepId, fallback: string) {
  return STEP_TITLES[stepId] ?? fallback;
}

function getStepSummary(stepId: OrcidV2StepId, fallback: string) {
  return STEP_SUMMARIES[stepId] ?? fallback;
}

function getReviewSectionLabel(id: string, fallback: string) {
  return REVIEW_SECTION_LABELS[id] ?? fallback;
}

function getScopeLabel(scope: string, fallback: string) {
  return SCOPE_LABELS[scope] ?? fallback;
}

function getReviewActionLabel(actionId: string, fallback: string) {
  if (actionId.startsWith("review:") && actionId.endsWith(":inspect")) {
    return "Inspecionar seção";
  }

  if (actionId.startsWith("review:") && actionId.endsWith(":manual")) {
    return "Abrir fila manual";
  }

  if (actionId.startsWith("review:") && actionId.endsWith(":sync")) {
    return "Enviar para sincronização";
  }

  switch (actionId) {
    case "accept-works":
      return "Aceitar tudo";
    case "inspect-works":
      return "Inspecionar amostra";
    case "accept-affiliations":
      return "Aceitar com revisão";
    case "queue-affiliations":
      return "Enviar para a fila manual";
    default:
      return fallback;
  }
}

function getManualStatusLabel(status: keyof typeof MANUAL_STATUS_LABELS) {
  return MANUAL_STATUS_LABELS[status];
}

function getSyncStateLabel(state: keyof typeof SYNC_STATE_LABELS) {
  return SYNC_STATE_LABELS[state];
}

function getSyncItemStatusLabel(status: keyof typeof SYNC_ITEM_STATUS_LABELS) {
  return SYNC_ITEM_STATUS_LABELS[status];
}

function getSyncMessage(message?: string) {
  if (!message) {
    return undefined;
  }

  return SYNC_MESSAGE_LABELS[message] ?? message;
}

export function OrcidV2Wizard({
  steps,
  activeStepId,
  artifact,
  coverage,
  identity,
  consentScopes,
  reviewSections,
  manualQueue,
  syncReport,
  metaPanels = [],
  onStepChange,
  onAuthorize,
  onPrimaryAction,
  onManualAction,
  onUploadSelect
}: OrcidV2WizardProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedMetaPanelId, setExpandedMetaPanelId] = useState<string | null>(null);
  const activeStepIndex = useMemo(
    () => Math.max(0, steps.findIndex((step) => step.id === activeStepId)),
    [activeStepId, steps]
  );
  const activeStep = steps[activeStepIndex];
  const previousStep = activeStepIndex > 0 ? steps[activeStepIndex - 1] : undefined;
  const nextStep = activeStepIndex < steps.length - 1 ? steps[activeStepIndex + 1] : undefined;
  const derivedMetaPanels = useMemo(() => {
    const syncableCount = coverage
      .filter((item) => item.status !== "manual-only")
      .reduce((total, item) => total + item.count, 0);

    const localizedPanels = [
      {
        id: "current-session",
        title: "Sessão atual",
        summary: `${syncableCount} elegíveis · ${manualQueue.length} manuais`,
        items: [
          {
            label: "Plano",
            value: `${syncableCount} itens candidatos à sincronização`
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
            value:
              identity.scopes.length > 0
                ? identity.scopes.join(", ")
                : "OAuth pendente"
          }
        ]
      },
      {
        id: "review-rules",
        title: "Regras de revisão",
        summary: "Campos manuais, origem dos dados e privacidade",
        bullets: [
          "Biografia, nomes e e-mails permanecem apenas na fila manual.",
          "Só rascunhos em sincronização automática seguem para a etapa de sincronização.",
          "Itens já controlados por outra origem não entram em mutação automática.",
          "O navegador não persiste XML, comparações nem tokens além da sessão atual."
        ]
      }
    ];

    if (metaPanels.length === 0) {
      return localizedPanels;
    }

    const localizedById = new Map(localizedPanels.map((panel) => [panel.id, panel]));
    return metaPanels.map((panel) => localizedById.get(panel.id) ?? panel);
  }, [coverage, identity.orcidUri, identity.scopes, manualQueue.length, metaPanels]);

  function moveToStep(stepId?: OrcidV2StepId) {
    if (stepId) {
      onStepChange?.(stepId);
    }
  }

  function renderActiveStage() {
    switch (activeStepId) {
      case "upload":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Carregar XML</SectionHeading>
              <PanelBadge>{artifact ? "Processado" : "Aguardando arquivo"}</PanelBadge>
            </PanelHeader>
            <UploadZone>
              <UploadCopy>
                <UploadTitle>{artifact?.name ?? "Arraste ou escolha o XML do Lattes"}</UploadTitle>
                <UploadText>
                  Esta etapa cuida apenas da seleção do arquivo e da leitura local. Nada
                  segue para o fluxo ORCID antes da inspeção do XML em memória.
                </UploadText>
              </UploadCopy>
              <InlineActionRow>
                <PrimaryButton type="button" onClick={() => uploadInputRef.current?.click()}>
                  Escolher XML
                </PrimaryButton>
                <GhostButton type="button" onClick={() => onUploadSelect?.(null)}>
                  Limpar
                </GhostButton>
              </InlineActionRow>
              <ArtifactRow>
                <ArtifactName>{artifact?.name ?? "Nenhum XML selecionado"}</ArtifactName>
                <ArtifactMeta>
                  {artifact?.sourceLabel ?? "XML Lattes"}
                  {artifact?.encoding ? ` · ${artifact.encoding}` : ""}
                  {artifact?.sizeBytes ? ` · ${(artifact.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}
                </ArtifactMeta>
              </ArtifactRow>
            </UploadZone>

            <HiddenFileInput
              ref={uploadInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(event) => onUploadSelect?.(event.currentTarget.files?.[0] ?? null)}
            />
          </PanelCard>
        );
      case "coverage":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Cobertura detectada</SectionHeading>
              <PanelBadge>{coverage.length} grupos</PanelBadge>
            </PanelHeader>
            <UploadText>
              Revise o que pode seguir automaticamente, o que precisa de confirmação e o
              que deve permanecer na fila manual antes de qualquer escrita no ORCID.
            </UploadText>
            <CoverageGrid>
              {coverage.map((item) => (
                <CoverageCard key={item.id} data-status={item.status}>
                  <CoverageTop>
                    <CoverageLabel>{getCoverageLabel(item.id, item.label)}</CoverageLabel>
                    <CoverageCount>{item.count}</CoverageCount>
                  </CoverageTop>
                  <CoverageNote>{item.note}</CoverageNote>
                </CoverageCard>
              ))}
            </CoverageGrid>
          </PanelCard>
        );
      case "oauth":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Autenticar ORCID iD</SectionHeading>
              <PanelBadge>{identity.connected ? "Conectado" : "Aguardando OAuth"}</PanelBadge>
            </PanelHeader>
            <StageStack>
              <UploadText>
                A identidade do pesquisador vem apenas do OAuth da ORCID. A entrada manual
                fica bloqueada, e é aqui que o navegador sai do fluxo só de XML para pedir
                acesso ao registro.
              </UploadText>
              <IdentitySummaryCard>
                <IdentitySummaryTitle>
                  {identity.connected ? identity.displayName ?? "Perfil conectado" : "Nenhuma sessão ORCID ainda"}
                </IdentitySummaryTitle>
                <IdentitySummaryText>
                  {identity.connected
                    ? identity.orcidUri ?? "ORCID iD autenticado"
                    : "Use o login oficial da ORCID para autenticar o titular do registro."}
                </IdentitySummaryText>
              </IdentitySummaryCard>
              <InlineActionRow>
                <PrimaryButton type="button" onClick={onAuthorize}>
                  Conectar ORCID
                </PrimaryButton>
                <GhostButton type="button" onClick={() => moveToStep("consent")}>
                  Ver próxima etapa
                </GhostButton>
              </InlineActionRow>
            </StageStack>
          </PanelCard>
        );
      case "consent":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Consentimento e escopos</SectionHeading>
              <PanelBadge>{identity.connected ? "Conectado" : "Sem conexão"}</PanelBadge>
            </PanelHeader>
            <UploadText>
              Explique com clareza o que o app vai ler e escrever, depois mostre os escopos
              concedidos separando o que é obrigatório do que é opcional.
            </UploadText>
            <ScopeList>
              {consentScopes.map((scope) => (
                <ScopeRow key={scope.scope}>
                  <ScopeBody>
                    <ScopeTitle>{getScopeLabel(scope.scope, scope.label)}</ScopeTitle>
                    <ScopeDetail>{scope.scope}</ScopeDetail>
                  </ScopeBody>
                  <ScopeState data-granted={scope.granted}>
                    {scope.granted ? "Concedido" : scope.mandatory ? "Obrigatório" : "Opcional"}
                  </ScopeState>
                </ScopeRow>
              ))}
            </ScopeList>
            <InlineActionRow>
              <PrimaryButton type="button" onClick={onAuthorize}>
                Atualizar OAuth
              </PrimaryButton>
              <GhostButton type="button" onClick={() => onPrimaryAction?.("consent")}>
                Revisar texto do consentimento
              </GhostButton>
            </InlineActionRow>
          </PanelCard>
        );
      case "review":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Revisão por domínio</SectionHeading>
              <PanelBadge>Automático / revisão / manual</PanelBadge>
            </PanelHeader>
            <ReviewList>
              {reviewSections.map((section) => (
                <ReviewCard key={section.id} data-status={section.status}>
                  <ReviewTop>
                    <ReviewTitle>{getReviewSectionLabel(section.id, section.title)}</ReviewTitle>
                    <ReviewEndpoint>{section.endpoint}</ReviewEndpoint>
                  </ReviewTop>
                  <ReviewSummary>{section.summary}</ReviewSummary>
                  <ReviewFooter>
                    <ReviewCount>{section.count} itens</ReviewCount>
                    <ActionStack>
                      {section.actions.map((action) => (
                        <InlineActionButton
                          key={action.id}
                          type="button"
                          data-tone={action.tone ?? "secondary"}
                          onClick={() => onPrimaryAction?.(action.id)}
                        >
                          {getReviewActionLabel(action.id, action.label)}
                        </InlineActionButton>
                      ))}
                    </ActionStack>
                  </ReviewFooter>
                </ReviewCard>
              ))}
            </ReviewList>
          </PanelCard>
        );
      case "manual":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Fila manual</SectionHeading>
              <PanelBadge>{manualQueue.length} itens</PanelBadge>
            </PanelHeader>
            <ManualList>
              {manualQueue.map((item) => (
                <ManualCard key={item.id}>
                  <ManualTop>
                    <ManualTitle>{item.title}</ManualTitle>
                    <ManualState data-state={item.status}>{getManualStatusLabel(item.status)}</ManualState>
                  </ManualTop>
                  <ManualSource>{item.source}</ManualSource>
                  <ManualReason>{item.reason}</ManualReason>
                  {item.suggestion ? <ManualSuggestion>{item.suggestion}</ManualSuggestion> : null}
                  <InlineActionRow>
                    <GhostButton type="button" onClick={() => onManualAction?.(item.id, "done")}>
                      Marcar como concluído
                    </GhostButton>
                    <SecondaryButton type="button" onClick={() => onManualAction?.(item.id, "in-review")}>
                      Manter na fila
                    </SecondaryButton>
                  </InlineActionRow>
                </ManualCard>
              ))}
            </ManualList>
          </PanelCard>
        );
      case "sync":
        return (
          <PanelCard>
            <PanelHeader>
              <SectionHeading>Sincronização</SectionHeading>
              <PanelBadge data-state={syncReport.state}>{getSyncStateLabel(syncReport.state)}</PanelBadge>
            </PanelHeader>
            <SyncTop>
              <SyncMeter>
                <SyncMeterFill style={{ width: `${Math.max(0, Math.min(100, syncReport.progress))}%` }} />
              </SyncMeter>
              <SyncNumbers>
                <strong>{syncReport.progress}%</strong>
                <span>
                  {syncReport.total} itens no plano, {syncReport.items.length} acompanhados no relatório
                </span>
              </SyncNumbers>
            </SyncTop>
            {syncReport.message ? <ReportMessage>{getSyncMessage(syncReport.message)}</ReportMessage> : null}
            <ReportList>
              {syncReport.items.map((item) => (
                <ReportRow key={item.id} data-status={item.status}>
                  <ReportLeft>
                    <ReportTitle>{getEntityLabel(item.title, item.title)}</ReportTitle>
                    <ReportDetails>
                      {item.endpoint}
                      {item.putCode ? ` · put-code ${item.putCode}` : ""}
                    </ReportDetails>
                  </ReportLeft>
                  <ReportStatus>{getSyncItemStatusLabel(item.status)}</ReportStatus>
                  <ReportText>{item.details}</ReportText>
                </ReportRow>
              ))}
            </ReportList>
          </PanelCard>
        );
      case "report":
        return (
          <CardsGrid>
            <PanelCard>
              <PanelHeader>
                <SectionHeading>Relatório final</SectionHeading>
                <PanelBadge data-state={syncReport.state}>{getSyncStateLabel(syncReport.state)}</PanelBadge>
              </PanelHeader>
              <SyncNumbers>
                <strong>{syncReport.progress}%</strong>
                <span>{getSyncMessage(syncReport.message) ?? "Relatório pronto para revisão."}</span>
              </SyncNumbers>
              <ReportList>
                {syncReport.items.map((item) => (
                  <ReportRow key={item.id} data-status={item.status}>
                    <ReportLeft>
                      <ReportTitle>{getEntityLabel(item.title, item.title)}</ReportTitle>
                      <ReportDetails>
                        {item.endpoint}
                        {item.putCode ? ` · put-code ${item.putCode}` : ""}
                      </ReportDetails>
                    </ReportLeft>
                    <ReportStatus>{getSyncItemStatusLabel(item.status)}</ReportStatus>
                    <ReportText>{item.details}</ReportText>
                  </ReportRow>
                ))}
              </ReportList>
            </PanelCard>

            <PanelCard>
              <PanelHeader>
                <SectionHeading>Retidos para tratamento manual</SectionHeading>
                <PanelBadge>{manualQueue.length} itens</PanelBadge>
              </PanelHeader>
              <ManualList>
                {manualQueue.map((item) => (
                  <ManualCard key={item.id}>
                    <ManualTop>
                      <ManualTitle>{item.title}</ManualTitle>
                      <ManualState data-state={item.status}>{getManualStatusLabel(item.status)}</ManualState>
                    </ManualTop>
                    <ManualReason>{item.reason}</ManualReason>
                  </ManualCard>
                ))}
              </ManualList>
            </PanelCard>
          </CardsGrid>
        );
      default:
        return null;
    }
  }

  return (
    <WizardShell>
      <Header>
        <HeaderMeta>
          <MetaCard>
            <MetaLabel>Etapa atual</MetaLabel>
            <MetaValue>
              {formatStepCounter(activeStepIndex + 1)} / {formatStepCounter(steps.length)}
            </MetaValue>
          </MetaCard>
          <MetaCard $tone="accent">
            <MetaLabel>Ambiente</MetaLabel>
            <MetaValue>{identity.sandbox ? "Sandbox" : "Produção"}</MetaValue>
          </MetaCard>
          <MetaCard>
            <MetaLabel>Registro</MetaLabel>
            <MetaValue>{identity.connected ? "Conectado" : "Sem conexão"}</MetaValue>
          </MetaCard>
          {derivedMetaPanels.map((panel) => {
            const isExpanded = expandedMetaPanelId === panel.id;
            return (
              <MetaDisclosure key={panel.id} data-expanded={isExpanded}>
                <MetaDisclosureButton
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`meta-panel-${panel.id}`}
                  onClick={() =>
                    setExpandedMetaPanelId((current) => (current === panel.id ? null : panel.id))
                  }
                >
                  <MetaLabel>{panel.title}</MetaLabel>
                  <MetaDisclosureRow>
                    <MetaDisclosureSummary>{panel.summary}</MetaDisclosureSummary>
                    <MetaDisclosureChevron aria-hidden="true" data-expanded={isExpanded}>
                      ▾
                    </MetaDisclosureChevron>
                  </MetaDisclosureRow>
                </MetaDisclosureButton>
                <MetaDisclosureBody
                  id={`meta-panel-${panel.id}`}
                  data-expanded={isExpanded}
                  aria-hidden={!isExpanded}
                >
                  {panel.items?.length ? (
                    <MetaDisclosureList>
                      {panel.items.map((item) => (
                        <MetaDisclosureItem key={`${panel.id}-${item.label}`}>
                          <MetaDisclosureItemLabel>{item.label}</MetaDisclosureItemLabel>
                          <MetaDisclosureItemValue>{item.value}</MetaDisclosureItemValue>
                        </MetaDisclosureItem>
                      ))}
                    </MetaDisclosureList>
                  ) : null}
                  {panel.bullets?.length ? (
                    <MetaDisclosureBullets>
                      {panel.bullets.map((bullet) => (
                        <li key={`${panel.id}-${bullet}`}>{bullet}</li>
                      ))}
                    </MetaDisclosureBullets>
                  ) : null}
                </MetaDisclosureBody>
              </MetaDisclosure>
            );
          })}
        </HeaderMeta>
      </Header>

      <Layout>
        <Rail aria-label="Etapas do wizard">
          <RailCard>
            {steps.map((step) => (
              <StepButton
                key={step.id}
                type="button"
                data-state={step.state}
                aria-current={step.id === activeStepId ? "step" : undefined}
                onClick={() => onStepChange?.(step.id)}
              >
                <StepLabel>{step.label}</StepLabel>
                <StepCopy>
                  <StepTitle>{getStepTitle(step.id, step.title)}</StepTitle>
                  <StepSummary>{getStepSummary(step.id, step.summary)}</StepSummary>
                </StepCopy>
              </StepButton>
            ))}
          </RailCard>
        </Rail>

        <Main>
          <StageHero>
            <StageHeroContent>
              <SectionHeading>Etapa ativa</SectionHeading>
              <StageTitle>
                {activeStep ? getStepTitle(activeStep.id, activeStep.title) : "Fluxo"}
              </StageTitle>
              <StageText>
                {activeStep ? getStepSummary(activeStep.id, activeStep.summary) : undefined}
              </StageText>
            </StageHeroContent>
            <StageStats>
              <HeroStat>
                <HeroStatValue>{coverage.length}</HeroStatValue>
                <HeroStatLabel>grupos de cobertura</HeroStatLabel>
              </HeroStat>
              <HeroStat>
                <HeroStatValue>{manualQueue.length}</HeroStatValue>
                <HeroStatLabel>itens manuais</HeroStatLabel>
              </HeroStat>
              <HeroStat>
                <HeroStatValue>{syncReport.progress}%</HeroStatValue>
                <HeroStatLabel>progresso da sincronização</HeroStatLabel>
              </HeroStat>
            </StageStats>
          </StageHero>
          {renderActiveStage()}

          <StepFooter>
            <GhostButton
              type="button"
              onClick={() => moveToStep(previousStep?.id)}
              disabled={!previousStep}
            >
              Etapa anterior
            </GhostButton>
            <StepFooterMeta>
              A etapa {formatStepCounter(activeStepIndex + 1)} trata apenas de{" "}
              {activeStep ? getStepTitle(activeStep.id, activeStep.title).toLowerCase() : "a fase atual"}.
            </StepFooterMeta>
            <PrimaryButton
              type="button"
              onClick={() => moveToStep(nextStep?.id)}
              disabled={!nextStep}
            >
              Próxima etapa
            </PrimaryButton>
          </StepFooter>
        </Main>
      </Layout>

      <WizardFooter>
        <WizardFooterCopy>
          Projeto Open-Source criado para conectar Lattes e ORCID e poupar
          muitas horas de trabalho repetitivo de pesquisadores brasileiros.
        </WizardFooterCopy>
        <WizardFooterLinks aria-label="Links institucionais">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </WizardFooterLinks>
      </WizardFooter>
    </WizardShell>
  );
}

const WizardShell = styled.section`
  position: relative;
  overflow: hidden;
  padding: 32px;
  border-radius: 34px;
  color: #10161f;
  background:
    radial-gradient(circle at 0 0, rgba(199, 243, 235, 0.9), transparent 28%),
    radial-gradient(circle at 100% 0, rgba(255, 216, 201, 0.72), transparent 26%),
    linear-gradient(180deg, #fff9ef 0%, #fff4dd 100%);

  @media (max-width: 760px) {
    padding: 18px;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  animation: ${drift} 450ms ease-out both;
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 12px;
`;

const MetaCard = styled.div<{ $tone?: "accent" }>`
  min-width: 148px;
  min-height: 98px;
  flex: 0 0 clamp(148px, 15vw, 172px);
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(16, 22, 31, 0.1);
  background: ${({ $tone }) =>
    $tone === "accent" ? "linear-gradient(180deg, rgba(15, 118, 110, 0.16), rgba(15, 118, 110, 0.06))" : "rgba(255, 255, 255, 0.72)"};
  box-shadow: 0 12px 28px rgba(16, 22, 31, 0.08);
`;

const MetaLabel = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(16, 22, 31, 0.58);
`;

const MetaValue = styled.div`
  margin-top: 8px;
  font-family: var(--font-heading), sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.15;
`;

const MetaDisclosure = styled.div`
  flex: 1 1 280px;
  align-self: flex-start;
  min-width: min(280px, 100%);
  min-height: 98px;
  max-width: 380px;
  border-radius: 20px;
  border: 1px solid rgba(16, 22, 31, 0.1);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 12px 28px rgba(16, 22, 31, 0.08);
  overflow: hidden;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(16, 22, 31, 0.1);
  }

  &[data-expanded="true"] {
    border-color: rgba(15, 118, 110, 0.18);
    box-shadow: 0 20px 38px rgba(16, 22, 31, 0.12);
  }
`;

const MetaDisclosureButton = styled.button`
  width: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: space-between;
  gap: 8px;
  min-height: 98px;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid rgba(15, 118, 110, 0.28);
    outline-offset: -3px;
  }
`;

const MetaDisclosureRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: start;
  justify-content: space-between;
`;

const MetaDisclosureSummary = styled.div`
  font-weight: 700;
  line-height: 1.45;
  color: rgba(16, 22, 31, 0.84);
`;

const MetaDisclosureChevron = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(16, 22, 31, 0.06);
  color: rgba(16, 22, 31, 0.7);
  font-size: 0.92rem;
  transition: transform 180ms ease;

  &[data-expanded="true"] {
    transform: rotate(180deg);
  }
`;

const MetaDisclosureBody = styled.div`
  display: grid;
  gap: 12px;
  max-height: 0;
  padding: 0 16px;
  overflow: hidden;
  opacity: 0;
  transition:
    max-height 220ms ease,
    opacity 180ms ease,
    padding 220ms ease;

  &[data-expanded="true"] {
    max-height: 240px;
    padding: 0 16px 16px;
    opacity: 1;
  }
`;

const MetaDisclosureList = styled.div`
  display: grid;
  gap: 10px;
`;

const MetaDisclosureItem = styled.div`
  display: grid;
  gap: 2px;
`;

const MetaDisclosureItemLabel = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(16, 22, 31, 0.52);
`;

const MetaDisclosureItemValue = styled.span`
  line-height: 1.45;
  font-weight: 700;
  color: rgba(16, 22, 31, 0.84);
  word-break: break-word;
`;

const MetaDisclosureBullets = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: rgba(16, 22, 31, 0.76);
  line-height: 1.55;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

const Rail = styled.aside`
  display: grid;
  gap: 16px;
  position: sticky;
  top: 20px;

  @media (max-width: 1120px) {
    position: static;
  }
`;

const RailCard = styled.nav`
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 28px;
  border: 1px solid rgba(16, 22, 31, 0.1);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 20px 60px rgba(16, 22, 31, 0.1);
`;

const StepButton = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 0;
  border-radius: 20px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    transform 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(15, 118, 110, 0.08);
  }

  &:focus-visible {
    outline: 3px solid rgba(15, 118, 110, 0.32);
    outline-offset: 2px;
  }

  &[data-state="complete"] {
    background: rgba(199, 243, 235, 0.34);
  }

  &[data-state="active"] {
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(255, 216, 201, 0.28));
    box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.18);
  }

  &[data-state="attention"] {
    background: rgba(219, 92, 63, 0.1);
  }
`;

const StepLabel = styled.span`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(16, 22, 31, 0.06);
  font-size: 0.82rem;
  font-weight: 800;
`;

const StepCopy = styled.span`
  display: grid;
  gap: 4px;
`;

const StepTitle = styled.span`
  font-weight: 800;
  font-size: 0.98rem;
`;

const StepSummary = styled.span`
  color: rgba(16, 22, 31, 0.72);
  line-height: 1.5;
  font-size: 0.92rem;
`;

const SectionHeading = styled.h2`
  margin: 0;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(16, 22, 31, 0.56);
`;

const InlineActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
`;

const buttonBase = css`
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  transition:
    transform 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid rgba(15, 118, 110, 0.32);
    outline-offset: 2px;
  }
`;

const PrimaryButton = styled.button`
  ${buttonBase};
  color: #fffaf1;
  background: linear-gradient(135deg, #0f766e, #0a5b55);
  box-shadow: 0 16px 32px rgba(15, 118, 110, 0.26);
`;

const GhostButton = styled.button`
  ${buttonBase};
  color: #10161f;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.12);
`;

const SecondaryButton = styled.button`
  ${buttonBase};
  color: #10161f;
  background: rgba(255, 216, 201, 0.48);
  box-shadow: inset 0 0 0 1px rgba(219, 92, 63, 0.16);
`;

const Main = styled.main`
  display: grid;
  gap: 18px;
`;

const StageStack = styled.div`
  display: grid;
  gap: 16px;
`;

const StageHero = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  padding: 22px;
  border-radius: 30px;
  border: 1px solid rgba(16, 22, 31, 0.1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 244, 221, 0.9));
  box-shadow: 0 20px 60px rgba(16, 22, 31, 0.08);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StageHeroContent = styled.div`
  max-width: 66ch;
`;

const StageTitle = styled.h2`
  margin: 10px 0 0;
  font-family: var(--font-heading), sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  line-height: 1;
  letter-spacing: -0.04em;
`;

const StageText = styled.p`
  margin: 12px 0 0;
  line-height: 1.65;
  color: rgba(16, 22, 31, 0.78);
`;

const StageStats = styled.div`
  display: grid;
  grid-auto-flow: column;
  gap: 12px;
  align-items: start;

  @media (max-width: 760px) {
    grid-auto-flow: row;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const HeroStat = styled.div`
  min-width: 110px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);
`;

const HeroStatValue = styled.div`
  font-family: var(--font-heading), sans-serif;
  font-size: 1.9rem;
  font-weight: 800;
`;

const HeroStatLabel = styled.div`
  margin-top: 4px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(16, 22, 31, 0.58);
`;

const CardsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const PanelCard = styled.section`
  padding: 20px;
  border-radius: 28px;
  border: 1px solid rgba(16, 22, 31, 0.1);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 20px 60px rgba(16, 22, 31, 0.08);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
`;

const PanelBadge = styled.span`
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(16, 22, 31, 0.06);
  color: rgba(16, 22, 31, 0.74);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;

  &[data-state="complete"],
  &[data-state="synced"] {
    background: rgba(199, 243, 235, 0.55);
    color: #0a5b55;
  }

  &[data-state="error"],
  &[data-state="failure"] {
    background: rgba(219, 92, 63, 0.14);
    color: #8b2e1f;
  }
`;

const ArtifactRow = styled.div`
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(255, 216, 201, 0.18));
`;

const UploadZone = styled.div`
  display: grid;
  gap: 14px;
`;

const UploadCopy = styled.div`
  display: grid;
  gap: 8px;
`;

const UploadTitle = styled.div`
  font-family: var(--font-heading), sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
`;

const UploadText = styled.p`
  margin: 0;
  line-height: 1.6;
  color: rgba(16, 22, 31, 0.74);
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  border: 0;
  clip: rect(0, 0, 0, 0);
`;

const ArtifactName = styled.div`
  font-weight: 800;
`;

const ArtifactMeta = styled.div`
  font-size: 0.9rem;
  color: rgba(16, 22, 31, 0.72);
`;

const IdentitySummaryCard = styled.div`
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(255, 216, 201, 0.18));
`;

const IdentitySummaryTitle = styled.div`
  font-weight: 800;
`;

const IdentitySummaryText = styled.p`
  margin: 8px 0 0;
  line-height: 1.6;
  color: rgba(16, 22, 31, 0.76);
`;

const CoverageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 16px;
`;

const CoverageCard = styled.div`
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);

  &[data-status="auto-sync"] {
    background: linear-gradient(180deg, rgba(199, 243, 235, 0.5), rgba(255, 255, 255, 0.86));
  }

  &[data-status="review-required"] {
    background: linear-gradient(180deg, rgba(255, 216, 201, 0.52), rgba(255, 255, 255, 0.86));
  }

  &[data-status="manual-only"] {
    background: linear-gradient(180deg, rgba(219, 92, 63, 0.12), rgba(255, 255, 255, 0.86));
  }
`;

const CoverageTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
`;

const CoverageLabel = styled.div`
  font-weight: 800;
`;

const CoverageCount = styled.div`
  font-family: var(--font-heading), sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
`;

const CoverageNote = styled.p`
  margin: 10px 0 0;
  color: rgba(16, 22, 31, 0.74);
  line-height: 1.5;
`;

const ScopeList = styled.div`
  display: grid;
  gap: 10px;
`;

const ScopeRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);
`;

const ScopeBody = styled.div`
  display: grid;
  gap: 4px;
`;

const ScopeTitle = styled.div`
  font-weight: 800;
`;

const ScopeDetail = styled.div`
  font-size: 0.86rem;
  color: rgba(16, 22, 31, 0.66);
`;

const ScopeState = styled.div`
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(16, 22, 31, 0.06);

  &[data-granted="true"] {
    background: rgba(199, 243, 235, 0.65);
    color: #0a5b55;
  }
`;

const ReviewList = styled.div`
  display: grid;
  gap: 12px;
`;

const ReviewCard = styled.article`
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);

  &[data-status="auto-sync"] {
    border-left: 4px solid rgba(15, 118, 110, 0.72);
  }

  &[data-status="review-required"] {
    border-left: 4px solid rgba(197, 138, 34, 0.72);
  }

  &[data-status="manual-only"] {
    border-left: 4px solid rgba(219, 92, 63, 0.72);
  }
`;

const ReviewTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
`;

const ReviewTitle = styled.div`
  font-weight: 800;
`;

const ReviewEndpoint = styled.div`
  font-size: 0.82rem;
  color: rgba(16, 22, 31, 0.64);
`;

const ReviewSummary = styled.p`
  margin: 12px 0 0;
  line-height: 1.55;
  color: rgba(16, 22, 31, 0.76);
`;

const ReviewFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-top: 16px;

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ReviewCount = styled.div`
  font-size: 0.86rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(16, 22, 31, 0.56);
`;

const ActionStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const InlineActionButton = styled.button`
  ${buttonBase};
  padding-inline: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: #10161f;
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.12);

  &[data-tone="primary"] {
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(15, 118, 110, 0.08));
  }

  &[data-tone="danger"] {
    background: rgba(219, 92, 63, 0.12);
  }
`;

const ManualList = styled.div`
  display: grid;
  gap: 12px;
`;

const ManualCard = styled.article`
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);
`;

const ManualTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
`;

const ManualTitle = styled.div`
  font-weight: 800;
`;

const ManualState = styled.div`
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(16, 22, 31, 0.06);
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;

  &[data-state="queued"] {
    background: rgba(197, 138, 34, 0.16);
    color: #7a5310;
  }

  &[data-state="done"] {
    background: rgba(199, 243, 235, 0.62);
    color: #0a5b55;
  }
`;

const ManualSource = styled.div`
  margin-top: 10px;
  font-size: 0.82rem;
  color: rgba(16, 22, 31, 0.6);
`;

const ManualReason = styled.p`
  margin: 10px 0 0;
  line-height: 1.55;
  color: rgba(16, 22, 31, 0.78);
`;

const ManualSuggestion = styled.div`
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(199, 243, 235, 0.38);
  color: rgba(16, 22, 31, 0.78);
`;

const SyncTop = styled.div`
  display: grid;
  gap: 14px;
`;

const SyncMeter = styled.div`
  height: 14px;
  border-radius: 999px;
  background: rgba(16, 22, 31, 0.08);
  overflow: hidden;
`;

const SyncMeterFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e, #c58a22);
`;

const SyncNumbers = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;

  strong {
    font-family: var(--font-heading), sans-serif;
    font-size: 1.8rem;
  }

  span {
    color: rgba(16, 22, 31, 0.68);
  }
`;

const ReportMessage = styled.p`
  margin: 16px 0 0;
  line-height: 1.6;
  color: rgba(16, 22, 31, 0.78);
`;

const ReportList = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 16px;
`;

const ReportRow = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 16px;
  align-items: start;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(16, 22, 31, 0.08);

  &[data-status="success"] {
    border-left: 4px solid rgba(15, 118, 110, 0.72);
  }

  &[data-status="failure"] {
    border-left: 4px solid rgba(219, 92, 63, 0.72);
  }

  &[data-status="pending"] {
    border-left: 4px solid rgba(197, 138, 34, 0.72);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ReportLeft = styled.div`
  display: grid;
  gap: 6px;
`;

const ReportTitle = styled.div`
  font-weight: 800;
`;

const ReportDetails = styled.div`
  font-size: 0.84rem;
  color: rgba(16, 22, 31, 0.64);
`;

const ReportStatus = styled.div`
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(16, 22, 31, 0.06);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.74rem;
  font-weight: 800;
`;

const ReportText = styled.div`
  grid-column: 1 / -1;
  color: rgba(16, 22, 31, 0.78);
  line-height: 1.55;
`;

const StepFooter = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(16, 22, 31, 0.08);
  background: rgba(255, 255, 255, 0.66);

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StepFooterMeta = styled.div`
  text-align: center;
  color: rgba(16, 22, 31, 0.7);
  line-height: 1.55;

  @media (max-width: 760px) {
    text-align: left;
  }
`;

const WizardFooter = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
  padding: 20px 22px;
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 32, 0.08);
  background: rgba(15, 23, 32, 0.92);
  color: rgba(255, 250, 241, 0.88);

  @media (max-width: 800px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const WizardFooterCopy = styled.p`
  margin: 0;
  max-width: 60ch;
  line-height: 1.6;
`;

const WizardFooterLinks = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-family: var(--font-heading), sans-serif;

  a {
    color: white;
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.22);
    padding-bottom: 2px;
  }
`;
