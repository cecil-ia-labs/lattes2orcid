import fs from "node:fs/promises";
import path from "node:path";

export async function readFixtureBuffer(relativePath: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), "fixtures", "lattes", relativePath));
}

export async function readFixtureText(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "fixtures", "lattes", relativePath), "utf8");
}
