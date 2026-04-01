import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { StyledComponentsRegistry } from "@/lib/styled-components-registry";

const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Lattes2BibTeX",
  description:
    "Converta currículos XML da Plataforma Lattes em arquivos BibTeX com foco em privacidade e importação no ORCID."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <StyledComponentsRegistry>
          <AppProviders>{children}</AppProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
