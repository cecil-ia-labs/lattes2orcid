import path from "node:path";
import { expect, test } from "@playwright/test";

const sanitizedFixture = path.resolve(
  process.cwd(),
  "fixtures/lattes/real/sanitized-lattes.xml"
);
const collisionFixture = path.resolve(
  process.cwd(),
  "fixtures/lattes/synthetic/collision.xml"
);

test("shows validation feedback and then completes a real conversion", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Lattes2BibTeX" })).toBeVisible();

  await page.getByTestId("convert-button").click();
  await expect(
    page.getByText("Selecione um arquivo XML da Plataforma Lattes antes de continuar.")
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(sanitizedFixture);
  await page.getByTestId("convert-button").click();

  await expect(page.getByTestId("conversion-success")).toBeVisible();
  await expect(page.getByTestId("download-button")).toBeEnabled();
  await expect(page.getByText("Distribuição por categoria")).toBeVisible();
});

test("renders parser warnings for citekey collisions", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(collisionFixture);
  await page.getByTestId("convert-button").click();

  await expect(page.getByText("citekey-collision")).toBeVisible();
  await expect(page.getByText("duplicate-identifier")).toBeVisible();
});
