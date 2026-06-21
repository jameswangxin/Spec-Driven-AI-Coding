import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { stringify as stringifyYaml } from "yaml";

import {
  loadSkillRegistry,
  loadExecutionPolicies,
  loadOrchestrationContext,
  inferNextStep,
  resolvePolicy,
  runOrchestration,
  writeAuditLog,
  generateExecutionId,
} from "../lib/orchestrator.js";

const skillRegistryYaml = `skills:
  - id: workflow-new
    name: Workflow New
    description: Create a new requirement work item, clarifying ambiguous requests first if needed
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: new
        keywords: ["新建", "需求"]
        file_patterns: ["docs/changes/REQ-*/proposal.md"]

  - id: workflow-confirm
    name: Workflow Confirm
    description: Confirm a draft requirement before planning
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: confirm
        keywords: ["确认", "澄清"]
        file_patterns: ["docs/changes/REQ-*/proposal.md"]

  - id: workflow-plan
    name: Workflow Plan
    description: Create a technical plan for an accepted requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: plan
        keywords: ["规划", "方案"]
        file_patterns: ["docs/changes/REQ-*/design.md", "docs/changes/REQ-*/tasks.md"]

  - id: workflow-exec
    name: Workflow Execute
    description: Execute a planned requirement
    side_effects:
      - writes_file
      - git_commit
    safety_level: write-code
    triggers:
      - intent: execute
        keywords: ["实施", "执行"]
        file_patterns: ["docs/changes/REQ-*/tasks.md", "docs/changes/REQ-*/implementation.md"]

  - id: workflow-check
    name: Workflow Check
    description: Verify an implemented requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: check
        keywords: ["验证", "检查"]
        file_patterns: ["docs/changes/REQ-*/verification.md"]

  - id: workflow-archive
    name: Workflow Archive
    description: Archive a verified requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: archive
        keywords: ["归档", "关闭"]
        file_patterns: ["docs/changes/REQ-*"]
`;

const executionPoliciesYaml = `policies:
  - skill: "*"
    auto_execute: false
    human_confirm: true
    audit_level: standard

  - skill: "workflow-*"
    auto_execute: false
    human_confirm: true
    audit_level: detailed
`;

function historyFor(status) {
  const entries = [
    "  - date: 2026-06-21\n    from: null\n    to: draft\n    note: Created",
  ];
  if (status !== "draft") entries.push("  - date: 2026-06-21\n    from: draft\n    to: accepted\n    note: Accepted");
  if (["planned", "implemented", "verified", "archived"].includes(status)) entries.push("  - date: 2026-06-21\n    from: accepted\n    to: planned\n    note: Planned");
  if (["implemented", "verified", "archived"].includes(status)) entries.push("  - date: 2026-06-21\n    from: planned\n    to: implemented\n    note: Implemented");
  if (["verified", "archived"].includes(status)) entries.push("  - date: 2026-06-21\n    from: implemented\n    to: verified\n    note: Verified");
  if (status === "archived") entries.push("  - date: 2026-06-21\n    from: verified\n    to: archived\n    note: Archived");
  if (status === "blocked") entries.push("  - date: 2026-06-21\n    from: accepted\n    to: blocked\n    note: Blocked");
  if (status === "canceled") entries.push("  - date: 2026-06-21\n    from: accepted\n    to: canceled\n    note: Canceled");
  if (status === "superseded") entries.push("  - date: 2026-06-21\n    from: accepted\n    to: superseded\n    note: Superseded");
  if (status === "reopened") {
    entries.push("  - date: 2026-06-21\n    from: accepted\n    to: planned\n    note: Planned");
    entries.push("  - date: 2026-06-21\n    from: planned\n    to: implemented\n    note: Implemented");
    entries.push("  - date: 2026-06-21\n    from: implemented\n    to: verified\n    note: Verified");
    entries.push("  - date: 2026-06-21\n    from: verified\n    to: reopened\n    note: Reopened");
  }
  return entries.join("\n");
}

const requirementContent = (status = "accepted", planRequired = true) => `---
id: REQ-0002
title: Orchestration requirement
status: ${status}
complexity: medium
risk_tags:
  - architecture
plan_required: ${planRequired}
plan_reason: Plan required for orchestration
created_at: 2026-06-21
updated_at: 2026-06-21
references: []
specs: []
history:
${historyFor(status)}
---

# REQ-0002: Orchestration requirement

Original requirement text.
`;

const designContent = `# REQ-0002 技术方案

## 1. 目标
目标内容。

## 2. 非目标
- 不做。

## 3. 改动范围
范围。

## 4. 方案设计
设计。

## 5. 数据流 / 调用链路
链路。

## 6. 接口 / 数据结构变化
变化。

## 7. 兼容性与迁移
兼容。

## 8. 风险与回滚
风险。

## 9. 测试策略
测试。

## 10. 实施步骤
1. 步骤。
`;

const currentTemplate = `# Current Workflow Context

## Current Requirement

<!-- workflow:current:start -->
old current content
<!-- workflow:current:end -->

## Required Reading Before Coding

Static reading instructions.
`;

async function orchestrationFixture(options = {}) {
  const projectRoot = await mkdtemp(join(tmpdir(), "workflow-orchestrator-"));
  const workflowRoot = join(projectRoot, ".workflow");
  const changeDir = join(projectRoot, "docs", "changes", "REQ-0002-orchestration");
  await mkdir(join(workflowRoot, "orchestration"), { recursive: true });
  await mkdir(join(workflowRoot, "audit", "executions"), { recursive: true });
  await mkdir(changeDir, { recursive: true });
  await writeFile(join(workflowRoot, "orchestration", "skill-registry.yaml"), skillRegistryYaml);
  await writeFile(join(workflowRoot, "orchestration", "execution-policies.yaml"), executionPoliciesYaml);
  await writeFile(
    join(changeDir, "proposal.md"),
    requirementContent(options.status ?? "accepted", options.planRequired ?? true),
  );
  if (options.withPlan !== false) {
    await writeFile(join(changeDir, "design.md"), designContent);
  }
  await writeFile(join(workflowRoot, "current.md"), currentTemplate);
  await writeFile(join(workflowRoot, "project.md"), "# Project\n");
  return { projectRoot, workflowRoot, changeDir };
}

test("loadSkillRegistry reads and parses skill registry", async () => {
  const { workflowRoot } = await orchestrationFixture();
  const registry = await loadSkillRegistry(workflowRoot);
  assert.equal(registry.skills.length, 6);
  assert.equal(registry.skills[0].id, "workflow-new");
  assert.deepEqual(registry.skills[0].side_effects, ["writes_file"]);
  assert.equal(registry.skills[1].safety_level, "write-workflow-only");
});

test("loadSkillRegistry throws when registry is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-empty-"));
  await assert.rejects(loadSkillRegistry(root), /Skill registry not found/);
});

test("loadExecutionPolicies reads and parses policies", async () => {
  const { workflowRoot } = await orchestrationFixture();
  const policies = await loadExecutionPolicies(workflowRoot);
  assert.equal(policies.policies.length, 2);
  assert.equal(policies.policies[0].skill, "*");
  assert.equal(policies.policies[1].skill, "workflow-*");
  assert.equal(policies.policies[1].human_confirm, true);
});

test("loadExecutionPolicies throws when policies file is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-empty-"));
  await assert.rejects(loadExecutionPolicies(root), /Execution policies not found/);
});

test("loadOrchestrationContext reads proposal, design, current, and project", async () => {
  const { workflowRoot, changeDir } = await orchestrationFixture();
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  assert.equal(context.reqId, "REQ-0002");
  assert.equal(context.requirement.data.id, "REQ-0002");
  assert.equal(context.requirement.path, join(changeDir, "proposal.md"));
  assert.equal(context.requirement.data.status, "accepted");
  assert.ok(context.plan);
  assert.equal(context.plan.path, join(changeDir, "design.md"));
  assert.equal(context.plan.filename, "design");
  assert.equal(context.artifacts.proposal, "docs/changes/REQ-0002-orchestration/proposal.md");
  assert.equal(context.artifacts.design, "docs/changes/REQ-0002-orchestration/design.md");
  assert.ok(context.current);
  assert.ok(context.project);
});

test("loadOrchestrationContext throws when requirement is missing", async () => {
  const { workflowRoot } = await orchestrationFixture();
  await assert.rejects(loadOrchestrationContext(workflowRoot, "REQ-9999"), /Requirement REQ-9999 does not exist/);
});

test("loadOrchestrationContext sets plan to null when design is missing", async () => {
  const { workflowRoot } = await orchestrationFixture({ withPlan: false });
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  assert.equal(context.plan, null);
  assert.equal(context.artifacts.design, null);
});

for (const [status, expectedSkill] of [
  ["draft", "workflow-confirm"],
  ["planned", "workflow-exec"],
  ["implemented", "workflow-check"],
  ["verified", "workflow-archive"],
  ["reopened", "workflow-confirm"],
]) {
  test("inferNextStep recommends " + expectedSkill + " when status is " + status, async () => {
    const { workflowRoot } = await orchestrationFixture({ status });
    const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
    const step = inferNextStep(context);
    assert.equal(step.skillId, expectedSkill);
  });
}

test("inferNextStep recommends workflow-plan when status is accepted and plan exists", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted" });
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-plan");
  assert.equal(step.reason, "Requirement is accepted; plan exists, recommend planning to refine or proceed.");
});

test("inferNextStep recommends workflow-plan when status is accepted and plan is missing", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted", withPlan: false });
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-plan");
  assert.equal(step.reason, "Requirement is accepted but no plan exists; recommend planning first.");
});

test("inferNextStep recommends workflow-exec when status is accepted and plan is skipped", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted", planRequired: false });
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-exec");
  assert.equal(step.reason, "Requirement is accepted and plan is skipped; recommend execution.");
});

for (const status of ["canceled", "superseded", "blocked"]) {
  test("inferNextStep returns null for " + status + " status", async () => {
    const { workflowRoot } = await orchestrationFixture({ status });
    const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
    const step = inferNextStep(context);
    assert.equal(step, null);
  });
}

test("inferNextStep returns compact recommendation when status is archived", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "archived" });
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, null);
  assert.equal(step.reason, "Requirement is archived; recommend compacting or starting a new session.");
});

test("resolvePolicy returns matching policy and fallbacks", async () => {
  const { workflowRoot } = await orchestrationFixture();
  const policies = await loadExecutionPolicies(workflowRoot);
  assert.equal(resolvePolicy(policies, "workflow-exec").audit_level, "detailed");
  assert.equal(resolvePolicy(policies, "workflow-check").human_confirm, true);
  policies.policies = policies.policies.filter((p) => p.skill !== "*");
  assert.equal(resolvePolicy(policies, "unknown:skill").auto_execute, false);
});

test("generateExecutionId produces unique IDs with timestamp format", async () => {
  const id1 = generateExecutionId();
  const id2 = generateExecutionId();
  assert.ok(id1.startsWith("exec-"));
  assert.notEqual(id1, id2);
  assert.ok(/exec-\d{8}-\d{6}-[a-f0-9]{8}/.test(id1));
});

test("writeAuditLog writes structured YAML audit file", async () => {
  const { workflowRoot } = await orchestrationFixture();
  const executionId = "exec-test-001";
  const audit = {
    execution_id: executionId,
    requirement: "docs/changes/REQ-0002-orchestration/proposal.md",
    plan: "docs/changes/REQ-0002-orchestration/design.md",
    trigger: { type: "explicit_command", input: "--orchestrate REQ-0002" },
    status: "completed",
    steps: [
      {
        step: 1,
        skill: "workflow-plan",
        status: "completed",
        auto_executed: false,
        human_confirmed: true,
        input_summary: "Plan refinement",
        output_summary: "Plan updated",
        side_effects: ["writes_file"],
        timestamps: { started: "2026-06-21T10:00:00Z", completed: "2026-06-21T10:05:00Z" },
      },
    ],
  };
  const logPath = await writeAuditLog(workflowRoot, audit);
  const content = await readFile(logPath, "utf8");
  assert.ok(content.includes("execution_id: exec-test-001"));
  assert.ok(content.includes("docs/changes/REQ-0002-orchestration/proposal.md"));
  assert.ok(content.includes("skill: workflow-plan"));
  assert.ok(content.includes("human_confirmed: true"));
  assert.ok(logPath.includes("audit/executions/"));
});

test("runOrchestration approves skill execution when confirmed", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "implemented" });
  const result = await runOrchestration(workflowRoot, "REQ-0002", { confirm: true });
  assert.equal(result.reqId, "REQ-0002");
  assert.equal(result.status, "approved");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].skill, "workflow-check");
  assert.equal(result.steps[0].auto_executed, false);
  assert.equal(result.steps[0].human_confirmed, true);
  assert.equal(result.steps[0].status, "approved");
});

test("runOrchestration requires human confirmation for write-side-effect skill", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(workflowRoot, "REQ-0002", { confirm: false });
  assert.equal(result.status, "paused");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].skill, "workflow-plan");
  assert.equal(result.steps[0].status, "paused");
  assert.equal(result.steps[0].auto_executed, false);
  assert.equal(result.steps[0].human_confirmed, false);
});

test("runOrchestration approves write-side-effect skill when confirmed", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(workflowRoot, "REQ-0002", { confirm: true });
  assert.equal(result.status, "approved");
  assert.equal(result.steps[0].status, "approved");
  assert.equal(result.steps[0].human_confirmed, true);
});

test("runOrchestration returns no-op when no next step is inferred", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "archived" });
  const result = await runOrchestration(workflowRoot, "REQ-0002", { confirm: true });
  assert.equal(result.status, "no-op");
  assert.equal(result.steps.length, 0);
});

test("runOrchestration writes audit log with docs artifact paths", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "implemented" });
  const result = await runOrchestration(workflowRoot, "REQ-0002", { confirm: true });
  const auditDir = join(workflowRoot, "audit", "executions");
  const files = await readdir(auditDir);
  assert.ok(files.length > 0);
  const content = await readFile(join(auditDir, files[0]), "utf8");
  assert.ok(content.includes(result.execution_id));
  assert.ok(content.includes("workflow-check"));
  assert.ok(content.includes("requirement: docs/changes/REQ-0002-orchestration/proposal.md"));
  assert.ok(content.includes("plan: docs/changes/REQ-0002-orchestration/design.md"));
  assert.ok(content.includes("proposal: docs/changes/REQ-0002-orchestration/proposal.md"));
});

test("runOrchestration throws when requirement does not exist", async () => {
  const { workflowRoot } = await orchestrationFixture();
  await assert.rejects(runOrchestration(workflowRoot, "REQ-9999", { confirm: true }), /Requirement REQ-9999 does not exist/);
});

test("runOrchestration throws when inferred skill is not registered", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted" });
  const registry = await loadSkillRegistry(workflowRoot);
  registry.skills = registry.skills.filter((s) => s.id !== "workflow-plan");
  await writeFile(join(workflowRoot, "orchestration", "skill-registry.yaml"), stringifyYaml(registry));
  await assert.rejects(runOrchestration(workflowRoot, "REQ-0002"), /Skill workflow-plan is not registered/);
});

test("runOrchestration audit log includes side effects", async () => {
  const { workflowRoot } = await orchestrationFixture({ status: "accepted" });
  await runOrchestration(workflowRoot, "REQ-0002", { confirm: true });
  const files = await readdir(join(workflowRoot, "audit", "executions"));
  const content = await readFile(join(workflowRoot, "audit", "executions", files[0]), "utf8");
  assert.ok(content.includes("writes_file"));
});

test("loadOrchestrationContext reads current.md and project.md content", async () => {
  const { workflowRoot } = await orchestrationFixture();
  const context = await loadOrchestrationContext(workflowRoot, "REQ-0002");
  assert.ok(context.current.includes("Current Workflow Context"));
  assert.ok(context.project.includes("# Project"));
});

test("writeAuditLog creates audit directory if missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-audit-"));
  const audit = {
    execution_id: "exec-test-002",
    requirement: "docs/changes/REQ-0002-orchestration/proposal.md",
    plan: null,
    trigger: { type: "explicit_command", input: "--orchestrate REQ-0002" },
    status: "no-op",
    steps: [],
  };
  const logPath = await writeAuditLog(root, audit);
  const content = await readFile(logPath, "utf8");
  assert.ok(content.includes("exec-test-002"));
});
