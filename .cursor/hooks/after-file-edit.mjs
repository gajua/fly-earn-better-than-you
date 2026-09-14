#!/usr/bin/env node
/**
 * afterFileEdit — light format / syntax check (not full suite).
 * stdin: Cursor hook JSON with file path fields.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath =
  input.file_path ||
  input.filePath ||
  input.path ||
  input.uri ||
  (Array.isArray(input.files) ? input.files[0] : null);

if (!filePath || typeof filePath !== "string") {
  process.stdout.write("{}\n");
  process.exit(0);
}

const ext = path.extname(filePath).toLowerCase();
const allowed = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mjs", ".cjs"]);
if (!allowed.has(ext)) {
  process.stdout.write("{}\n");
  process.exit(0);
}

const prettier = path.join(process.cwd(), "node_modules", ".bin", "prettier");
const result = spawnSync(prettier, ["--write", "--log-level", "warn", filePath], {
  encoding: "utf8",
});

if (result.status !== 0 && result.status !== null) {
  // Fail open for format issues — do not block edits.
  process.stderr.write(result.stderr || result.stdout || "prettier failed\n");
}

process.stdout.write("{}\n");
process.exit(0);
