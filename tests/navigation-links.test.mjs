import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

async function collectTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectTsxFiles(path)));
    if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(path);
  }

  return files;
}

test("internal navigation uses native anchors for deployed vinext compatibility", async () => {
  const files = await collectTsxFiles(new URL("../app", import.meta.url).pathname);
  const offenders = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (source.includes('from "next/link"')) offenders.push(file);
  }

  assert.deepEqual(offenders, [], `next/link breaks deployed navigation in: ${offenders.join(", ")}`);
});
