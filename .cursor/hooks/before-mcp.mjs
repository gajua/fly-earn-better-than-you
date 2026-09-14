#!/usr/bin/env node
/**
 * beforeMCPExecution — guard destructive external mutations only.
 */
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const toolName = String(
  input.toolName ?? input.tool_name ?? input.name ?? "",
).toLowerCase();
const args = JSON.stringify(input.arguments ?? input.args ?? input.input ?? {});

const destructive =
  /delete[_-]?branch|force[_-]?push|drop[_-]?(table|database|schema)|purge|destroy[_-]?project|rm\s+-rf|hard[_-]?reset/.test(
    `${toolName} ${args}`,
  );

if (destructive) {
  process.stdout.write(
    JSON.stringify({
      permission: "ask",
      user_message: "Destructive MCP operation requires explicit approval.",
      agent_message:
        "MCP call looks destructive (delete/drop/force). Ask before proceeding.",
    }),
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ permission: "allow" }));
process.exit(0);
