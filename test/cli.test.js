import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workflowBin = fileURLToPath(new URL("../bin/workflow.js", import.meta.url));

test("CLI prints audit summary as JSON", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "workflow-cli-audit-"));
  const auditDir = join(projectRoot, ".workflow", "audit", "executions");
  await mkdir(auditDir, { recursive: true });
  await writeFile(
    join(auditDir, "exec-test.yaml"),
    [
      "execution_id: exec-test",
      "requirement_id: REQ-0002",
      "execution_scope: workflow_decision",
      "status: approved",
      "started_at: 2026-06-21T10:00:00.000Z",
      "completed_at: 2026-06-21T10:00:00.004Z",
      "workflow_decision_duration_ms: 4",
      "steps:",
      "  - step: 1",
      "    skill: workflow-check",
      "    status: approved",
      "    auto_executed: false",
      "    human_confirmed: true",
      "    workflow_decision_duration_ms: 4",
      "    skill_provenance:",
      "      source_path: .codex/skills/workflow-check/SKILL.md",
      "      content_hash: sha256:abc",
      "",
    ].join("\n"),
  );

  const { stdout } = await execFileAsync(
    process.execPath,
    [workflowBin, "--audit-summary", "REQ-0002", "--format", "json"],
    { cwd: projectRoot },
  );

  const summary = JSON.parse(stdout);
  assert.equal(summary.reqId, "REQ-0002");
  assert.equal(summary.audit_scope, "workflow_decision");
  assert.equal(summary.totals.executions, 1);
  assert.equal(summary.skill_invocations["workflow-check"], 1);
  assert.ok(summary.limitations.includes("token_usage_not_captured"));
});
