#!/usr/bin/env node
/**
 * beforeShellExecution — block credential dumps / live-order automation helpers.
 * Reads stdin asynchronously so a hung pipe cannot deadlock the agent shell.
 */
import { stdin } from "node:process";

const allow = () => {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
  process.exit(0);
};

const deny = (message) => {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: message,
      agent_message: message,
    }),
  );
  process.exit(0);
};

const timer = setTimeout(() => allow(), 1_500);

let raw = "";
stdin.setEncoding("utf8");
stdin.on("data", (chunk) => {
  raw += chunk;
});
stdin.on("end", () => {
  clearTimeout(timer);
  let command = "";
  try {
    command = String(JSON.parse(raw || "{}").command ?? "");
  } catch {
    allow();
  }

  const denyPatterns = [
    /\bchrome:\/\/[^\s]*cookies\b/i,
    /\bdump[_-]?cookies?\b/i,
    /\b--dump-cookies\b/i,
    /\bsecurity\s+find-internet-password\b/i,
    /\bprintenv\b.*\b(SECRET|TOKEN|PASSWORD|API_KEY|SERVICE_ROLE)\b/i,
    /\becho\b.*\b(SUPABASE_SERVICE_ROLE|BROKER_SECRET|API_SECRET)\b/i,
    /\blive[_-]?order[_-]?submit\b/i,
    /\bautomate[_-]?broker[_-]?(click|submit)\b/i,
  ];

  for (const pattern of denyPatterns) {
    if (pattern.test(command)) {
      deny(
        "Blocked by project security hook (credential dump / live-order automation).",
      );
    }
  }
  allow();
});

stdin.on("error", () => {
  clearTimeout(timer);
  allow();
});
