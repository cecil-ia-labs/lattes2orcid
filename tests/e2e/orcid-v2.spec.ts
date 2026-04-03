import path from "node:path";
import { expect, test } from "@playwright/test";

const sanitizedFixture = path.resolve(
  process.cwd(),
  "fixtures/lattes/real/sanitized-lattes.xml"
);

test("builds an ORCID import plan from the sanitized fixture", async ({ page }) => {
  await page.goto("v2");

  await expect(page.getByTestId("orcid-v2-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lattes2ORCID v2" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(sanitizedFixture);

  await expect(page.getByText("Cobertura detectada")).toBeVisible();
  await expect(page.getByText("Produções", { exact: true })).toBeVisible();
  await expect(page.getByText("Somente manual", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Próxima etapa", exact: true }).click();
  await expect(page.getByText("Autenticar ORCID iD")).toBeVisible();

  await page.getByRole("button", { name: "Próxima etapa", exact: true }).click();
  await expect(page.getByText("Consentimento e escopos")).toBeVisible();

  await page.getByRole("button", { name: /^06 Fila manual/i }).click();
  await expect(page.getByRole("heading", { name: "Fila manual" }).last()).toBeVisible();
  await expect(page.getByText("Revisar biografia")).toBeVisible();
});
