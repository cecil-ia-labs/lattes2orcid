"use client";

import { ThemeProvider, createGlobalStyle } from "styled-components";

const theme = {
  colors: {
    ink: "#0f1720",
    paper: "#fffaf1",
    paperStrong: "#fff3d9",
    teal: "#0f766e",
    tealSoft: "#c7f3eb",
    coral: "#db5c3f",
    coralSoft: "#ffd8c9",
    gold: "#c58a22",
    slate: "#425466",
    line: "rgba(15, 23, 32, 0.12)"
  },
  radius: {
    lg: "28px",
    md: "18px",
    sm: "12px"
  },
  shadow: {
    soft: "0 18px 60px rgba(15, 23, 32, 0.12)"
  }
} as const;

const GlobalStyles = createGlobalStyle`
  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  html {
    min-height: 100%;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(199, 243, 235, 0.95), transparent 36%),
      radial-gradient(circle at 85% 0%, rgba(255, 216, 201, 0.8), transparent 28%),
      linear-gradient(180deg, #fff9ef 0%, #fff4dc 100%);
    color: ${({ theme }) => theme.colors.ink};
  }

  body,
  button,
  input,
  textarea {
    font-family: var(--font-body), sans-serif;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  ::selection {
    background: rgba(15, 118, 110, 0.2);
  }
`;

export function AppProviders({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}

export type AppTheme = typeof theme;
