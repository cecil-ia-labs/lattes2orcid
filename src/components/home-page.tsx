"use client";

import type {
    ConversionResponse,
    ConversionSummary,
    ConversionWarning,
    ErrorResponse
} from "@/lib/lattes/types"
import { startTransition, useMemo, useRef, useState } from "react"
import styled, { keyframes } from "styled-components"

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; payload: ConversionResponse }
  | { status: "error"; message: string };

const riseIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requestState, setRequestState] = useState<RequestState>({
    status: "idle"
  });
  const objectUrlRef = useRef<string | null>(null);

  const summary: ConversionSummary | null =
    requestState.status === "success" ? requestState.payload.summary : null;
  const warnings: ConversionWarning[] =
    requestState.status === "success" ? requestState.payload.warnings : [];

  const categoryRows = useMemo(() => {
    if (!summary) {
      return [];
    }

    return Object.entries(summary.categories).sort(([left], [right]) =>
      left.localeCompare(right)
    );
  }, [summary]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setRequestState({
        status: "error",
        message: "Selecione um arquivo XML da Plataforma Lattes antes de continuar."
      });
      return;
    }

    startTransition(async () => {
      setRequestState({ status: "loading" });

      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const response = await fetch("/api/convert/lattes-to-bibtex", {
          method: "POST",
          body: formData
        });

        const data = (await response.json()) as ConversionResponse | ErrorResponse;

        if (!response.ok || "error" in data) {
          throw new Error(
            "error" in data ? data.error.message : "Falha inesperada ao converter o XML."
          );
        }

        setRequestState({ status: "success", payload: data });
      } catch (error) {
        setRequestState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível concluir a conversão."
        });
      }
    });
  }

  function handleDownload() {
    if (requestState.status !== "success") {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = URL.createObjectURL(
      new Blob([requestState.payload.bibtex], {
        type: "application/x-bibtex;charset=utf-8"
      })
    );

    const anchor = document.createElement("a");
    anchor.href = objectUrlRef.current;
    anchor.download = requestState.payload.filename;
    anchor.click();
  }

  return (
    <PageShell>
      <HeroSection>
        <Eyebrow>Interoperabilidade acadêmica sem cópia manual</Eyebrow>
        <HeroGrid>
          <HeroText>
            <HeroTitle>Lattes2BibTeX</HeroTitle>
            <HeroLead>
              Converta o XML da Plataforma Lattes em um arquivo BibTeX pronto
              para o fluxo de importação do ORCID.
            </HeroLead>
            <HeroCopy>
              O processamento acontece sob demanda, sem cookies e sem
              persistência do arquivo enviado. O foco do v1 é extrair toda a
              produção bibliográfica compatível com o esquema oficial do
              currículo Lattes.
            </HeroCopy>
          </HeroText>
          <HeroCard>
            <HeroCardTitle>Como usar</HeroCardTitle>
            <InstructionList>
              <li>Exporte seu currículo em XML pela Plataforma Lattes.</li>
              <li>Envie o arquivo nesta página.</li>
              <li>Baixe o BibTeX gerado e importe no ORCID.</li>
            </InstructionList>
            <PrivacyNote>
              Limite padrão de upload: <strong>25 MB</strong>. O conteúdo não é
              salvo após a resposta.
            </PrivacyNote>
          </HeroCard>
        </HeroGrid>
      </HeroSection>

      <ContentGrid>
        <ConverterCard>
          <SectionTitle>Conversão</SectionTitle>
          <SectionText>
            Faça upload de um arquivo XML bruto do Lattes. O serviço valida a
            estrutura, extrai a produção bibliográfica e devolve o conteúdo em
            BibTeX.
          </SectionText>

          <Form onSubmit={handleSubmit}>
            <UploadPanel>
              <UploadLabel htmlFor="lattes-file">
                <span>Arquivo XML</span>
                <strong>
                  {selectedFile ? selectedFile.name : "Escolher arquivo"}
                </strong>
              </UploadLabel>
              <HiddenInput
                id="lattes-file"
                name="file"
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
              <UploadMeta>
                {selectedFile
                  ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`
                  : "Aceita apenas arquivos .xml"}
              </UploadMeta>
            </UploadPanel>

            <ActionRow>
              <PrimaryButton
                type="submit"
                disabled={requestState.status === "loading"}
                data-testid="convert-button"
              >
                {requestState.status === "loading"
                  ? "Convertendo..."
                  : "Gerar BibTeX"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                disabled={requestState.status !== "success"}
                onClick={handleDownload}
                data-testid="download-button"
              >
                Baixar resultado
              </SecondaryButton>
            </ActionRow>
          </Form>

          {requestState.status === "error" && (
            <StatusCard $tone="error" role="alert">
              {requestState.message}
            </StatusCard>
          )}

          {requestState.status === "success" && (
            <StatusCard $tone="success" data-testid="conversion-success">
              Conversão concluída. O BibTeX está pronto para download.
            </StatusCard>
          )}
        </ConverterCard>

        <ResultsCard>
          <SectionTitle>Resumo da execução</SectionTitle>
          <SectionText>
            O painel mostra quantos registros foram convertidos, quantos caíram
            em `@misc` e quais avisos precisam de revisão manual.
          </SectionText>

          <MetricsGrid>
            <MetricTile>
              <MetricValue>{summary?.totalItems ?? 0}</MetricValue>
              <MetricLabel>Registros detectados</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.convertedItems ?? 0}</MetricValue>
              <MetricLabel>Registros convertidos</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.fallbackMiscItems ?? 0}</MetricValue>
              <MetricLabel>Fallback em @misc</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.skippedItems ?? 0}</MetricValue>
              <MetricLabel>Registros ignorados</MetricLabel>
            </MetricTile>
          </MetricsGrid>

          <Subsection>
            <SubsectionTitle>Distribuição por categoria</SubsectionTitle>
            {categoryRows.length > 0 ? (
              <SummaryList>
                {categoryRows.map(([label, total]) => (
                  <SummaryRow key={label}>
                    <span>{label}</span>
                    <strong>{total}</strong>
                  </SummaryRow>
                ))}
              </SummaryList>
            ) : (
              <EmptyState>Aguardando um arquivo convertido.</EmptyState>
            )}
          </Subsection>

          <Subsection>
            <SubsectionTitle>Avisos</SubsectionTitle>
            {warnings.length > 0 ? (
              <WarningList>
                {warnings.map((warning, index) => (
                  <WarningItem key={`${warning.code}-${index}`}>
                    <strong>{warning.code}</strong>
                    <span>{warning.message}</span>
                  </WarningItem>
                ))}
              </WarningList>
            ) : (
              <EmptyState>Nenhum aviso gerado até o momento.</EmptyState>
            )}
          </Subsection>
        </ResultsCard>
      </ContentGrid>

      <Footer>
        <FooterCopy>
          Projeto open source mantido para facilitar a integração entre Lattes,
          ORCID e fluxos bibliográficos acadêmicos.
        </FooterCopy>
        <FooterLinks>
          <a href="https://github.com/cecil-ia-labs/lattes2orcid">GitHub</a>
          <a href="https://cecilialabs.com">Santa Catarina Laboratório</a>
          <a href="https://orcid.org">ORCID</a>
        </FooterLinks>
      </Footer>
    </PageShell>
  );
}

const PageShell = styled.main`
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 64px;
`;

const HeroSection = styled.section`
  position: relative;
  overflow: hidden;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(
    135deg,
    rgba(255, 250, 241, 0.96),
    rgba(255, 243, 217, 0.92)
  );
  box-shadow: ${({ theme }) => theme.shadow.soft};
  animation: ${riseIn} 0.8s ease both;

  &::after {
    content: "";
    position: absolute;
    inset: auto -40px -90px auto;
    width: 240px;
    height: 240px;
    background: radial-gradient(circle, rgba(15, 118, 110, 0.18), transparent 68%);
    pointer-events: none;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  font-family: var(--font-heading), sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.teal};
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const HeroText = styled.div`
  display: grid;
  gap: 14px;
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-family: var(--font-heading), sans-serif;
  font-size: clamp(2.8rem, 7vw, 5rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
`;

const HeroLead = styled.p`
  margin: 0;
  font-size: clamp(1.2rem, 2.4vw, 1.6rem);
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.slate};
`;

const HeroCopy = styled.p`
  margin: 0;
  max-width: 62ch;
  font-size: 1.05rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.slate};
`;

const HeroCard = styled.aside`
  align-self: start;
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(15, 23, 32, 0.08);
  backdrop-filter: blur(10px);
`;

const HeroCardTitle = styled.h2`
  margin: 0;
  font-family: var(--font-heading), sans-serif;
  font-size: 1.4rem;
`;

const InstructionList = styled.ol`
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  line-height: 1.6;
`;

const PrivacyNote = styled.p`
  margin: 0;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.tealSoft};
  color: ${({ theme }) => theme.colors.ink};
`;

const ContentGrid = styled.section`
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const BaseCard = styled.article`
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  animation: ${riseIn} 0.8s ease both;
`;

const ConverterCard = styled(BaseCard)``;

const ResultsCard = styled(BaseCard)``;

const SectionTitle = styled.h2`
  margin: 0 0 8px;
  font-family: var(--font-heading), sans-serif;
  font-size: 1.7rem;
`;

const SectionText = styled.p`
  margin: 0 0 18px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.slate};
`;

const Form = styled.form`
  display: grid;
  gap: 18px;
`;

const UploadPanel = styled.div`
  display: grid;
  gap: 10px;
  padding: 22px;
  border: 1px dashed rgba(15, 118, 110, 0.35);
  border-radius: ${({ theme }) => theme.radius.md};
  background:
    linear-gradient(135deg, rgba(199, 243, 235, 0.38), rgba(255, 255, 255, 0.9));
`;

const UploadLabel = styled.label`
  display: grid;
  gap: 6px;
  cursor: pointer;

  span {
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.slate};
  }

  strong {
    font-family: var(--font-heading), sans-serif;
    font-size: 1.15rem;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const UploadMeta = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.slate};
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
`;

const BaseButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 14px 22px;
  font-family: var(--font-heading), sans-serif;
  font-size: 1rem;
  font-weight: 700;
  transition:
    transform 160ms ease,
    opacity 160ms ease,
    box-shadow 160ms ease;

  &:enabled:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(BaseButton)`
  background: ${({ theme }) => theme.colors.ink};
  color: white;
  box-shadow: 0 18px 28px rgba(15, 23, 32, 0.18);
`;

const SecondaryButton = styled(BaseButton)`
  background: ${({ theme }) => theme.colors.coralSoft};
  color: ${({ theme }) => theme.colors.ink};
`;

const StatusCard = styled.div<{ $tone: "success" | "error" }>`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $tone, theme }) =>
    $tone === "success" ? theme.colors.tealSoft : theme.colors.coralSoft};
  color: ${({ theme }) => theme.colors.ink};
  gap: 10;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const MetricTile = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.paper};
`;

const MetricValue = styled.div`
  font-family: var(--font-heading), sans-serif;
  font-size: 2rem;
`;

const MetricLabel = styled.div`
  color: ${({ theme }) => theme.colors.slate};
`;

const Subsection = styled.section`
  margin-top: 22px;
`;

const SubsectionTitle = styled.h3`
  margin: 0 0 10px;
  font-family: var(--font-heading), sans-serif;
  font-size: 1.1rem;
`;

const SummaryList = styled.div`
  display: grid;
  gap: 8px;
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: rgba(255, 250, 241, 0.82);
  border: 1px solid ${({ theme }) => theme.colors.line};
`;

const WarningList = styled.div`
  display: grid;
  gap: 10px;
`;

const WarningItem = styled.div`
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: rgba(255, 216, 201, 0.42);
  border: 1px solid rgba(219, 92, 63, 0.18);

  strong {
    font-family: var(--font-heading), sans-serif;
  }

  span {
    line-height: 1.55;
  }
`;

const EmptyState = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.slate};
`;

const Footer = styled.footer`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding: 20px 4px 0;
  color: ${({ theme }) => theme.colors.slate};

  @media (max-width: 800px) {
    flex-direction: column;
  }
`;

const FooterCopy = styled.p`
  margin: 0;
  max-width: 58ch;
  line-height: 1.6;
`;

const FooterLinks = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-family: var(--font-heading), sans-serif;

  a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
`;
