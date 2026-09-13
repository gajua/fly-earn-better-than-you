import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "template") {
      continue;
    }
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
};

/** Production broker adapters must not automate live order UI actions. */
const FORBIDDEN = [
  /\.click\s*\(/,
  /\.requestSubmit\s*\(/,
  /HTMLFormElement\.prototype\.submit/,
  /\.submit\s*\(\s*\)/,
  /dispatchEvent\s*\(\s*new\s+MouseEvent/,
  /new\s+KeyboardEvent\s*\(\s*["']keydown["']/,
];

describe("forbidden live actions guard", () => {
  it("keeps production broker adapters free of live click/submit automation", () => {
    const brokerRoot = path.join(root, "packages/broker-adapters/src/brokers");
    const files = walk(brokerRoot).filter(
      (file) =>
        !file.includes(`${path.sep}fixtures${path.sep}`) &&
        !file.endsWith(".test.ts"),
    );
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) {
          offenders.push(`${path.relative(root, file)} :: ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
