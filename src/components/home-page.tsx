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
        <Eyebrow>Foque no que realmente importa, sem retrabalho</Eyebrow>
        <HeroGrid>
          <HeroText>
            <HeroTitle>Lattes 2 ORCID</HeroTitle>
            <HeroLead>
              Converta seus artigos e publicações da Plataforma Lattes para o ORCID de forma rápida, prática e totalmente segura.
            </HeroLead>
            <HeroCopy>
              Envie o XML, gere o arquivo e siga em frente. Nada de copiar
              referência por referência. O processamento acontece sem cookies e
              sem guardar o conteúdo após a conversão.
            </HeroCopy>
          </HeroText>
          <HeroCard>
            <HeroCardTitle>Como funciona</HeroCardTitle>
            <InstructionList>
              <li>Baixe o XML do seu currículo na Plataforma Lattes.</li>
              <li>Envie o arquivo aqui.</li>
              <li>Baixe o `.bib` e importe no ORCID.</li>
            </InstructionList>
            <PrivacyNote>
              Upload de até <strong>25 MB</strong>. O arquivo existe só durante
              a conversão.
            </PrivacyNote>
          </HeroCard>
        </HeroGrid>
      </HeroSection>

      <ContentGrid>
        <ConverterCard>
          <SectionTitle>Enviar currículo</SectionTitle>
          <SectionText>
            Use o XML exportado pelo Lattes. A ferramenta valida a estrutura,
            extrai a produção bibliográfica e devolve um BibTeX pronto para
            revisão e importação.
          </SectionText>

          <Form onSubmit={handleSubmit}>
            <UploadPanel>
              <UploadLabel htmlFor="lattes-file">
                <span>Arquivo do Lattes</span>
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
                  : "Aceita apenas XML exportado pela Plataforma Lattes"}
              </UploadMeta>
            </UploadPanel>

            <ActionRow>
              <PrimaryButton
                type="submit"
                disabled={requestState.status === "loading"}
                data-testid="convert-button"
              >
                {requestState.status === "loading"
                  ? "Convertendo XML..."
                  : "Converter para BibTeX"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                disabled={requestState.status !== "success"}
                onClick={handleDownload}
                data-testid="download-button"
              >
                Baixar .bib
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
              Pronto. Seu BibTeX foi gerado e já pode ser baixado.
            </StatusCard>
          )}
        </ConverterCard>

        <ResultsCard>
          <SectionTitle>Resumo da conversão</SectionTitle>
          <SectionText>
            Aqui você vê quantos itens entraram, quantos foram convertidos e
            onde ainda vale uma revisão manual.
          </SectionText>

          <MetricsGrid>
            <MetricTile>
              <MetricValue>{summary?.totalItems ?? 0}</MetricValue>
              <MetricLabel>Itens encontrados</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.convertedItems ?? 0}</MetricValue>
              <MetricLabel>Itens convertidos</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.fallbackMiscItems ?? 0}</MetricValue>
              <MetricLabel>Itens em @misc</MetricLabel>
            </MetricTile>
            <MetricTile>
              <MetricValue>{summary?.skippedItems ?? 0}</MetricValue>
              <MetricLabel>Itens ignorados</MetricLabel>
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
              <EmptyState>Envie um XML para ver o resumo da conversão.</EmptyState>
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
              <EmptyState>Nenhum aviso por enquanto.</EmptyState>
            )}
          </Subsection>
        </ResultsCard>
      </ContentGrid>

      <Footer>
        <FooterCopy>
          Projeto Open-Source criado para conectar Lattes e ORCID e poupar
          muitas horas de trabalho repetitivo de pesquisadores brasileiros.
        </FooterCopy>
        <FooterLinks>
          <a href="https://cecilialabs.com">Cecil-IA Labs</a>
          <a href="https://github.com/cecil-ia-labs/lattes2orcid">GitHub</a>
          <a href="https://lattes.cnpq.br">Plataforma Lattes</a>
          <a href="https://www.gov.br/cnpq/pt-br">CNPq</a>
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
  gap: 12px;
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
  max-width: 58ch;
  font-size: 1.05rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.slate};
`;

const HeroCard = styled.aside`
  align-self: start;
  display: grid;
  gap: 14px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 32, 0.1);
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
  padding: 15px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: linear-gradient(
    135deg,
    rgba(199, 243, 235, 0.95),
    rgba(255, 250, 241, 0.92)
  );
  border: 1px solid rgba(15, 118, 110, 0.16);
  color: ${({ theme }) => theme.colors.ink};
  line-height: 1.55;
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
  max-width: 60ch;
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
  align-items: center;
  gap: 18px;
  margin-top: 24px;
  padding: 20px 22px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(15, 23, 32, 0.08);
  background: rgba(15, 23, 32, 0.92);
  color: rgba(255, 250, 241, 0.88);

  @media (max-width: 800px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const FooterCopy = styled.p`
  margin: 0;
  max-width: 60ch;
  line-height: 1.6;
`;

const FooterLinks = styled.nav`
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
