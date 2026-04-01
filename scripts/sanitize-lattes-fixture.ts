import fs from "node:fs/promises";
import path from "node:path";
import { sanitizeLattesXmlBuffer } from "@/lib/lattes/sanitize";

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    throw new Error(
      "Uso: tsx scripts/sanitize-lattes-fixture.ts <arquivo-entrada.xml> <arquivo-saida.xml>"
    );
  }

  const buffer = await fs.readFile(inputPath);
  const sanitized = await sanitizeLattesXmlBuffer(buffer);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, sanitized, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
