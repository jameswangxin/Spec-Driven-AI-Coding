import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  access,
} from "node:fs/promises";
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

// Fixtures

const skillRegistryYaml = `skills:
  - id: workflow-brainstorm
    name: Workflow Brainstorm
    description: Explore and clarify a new idea before it becomes a formal requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: brainstorm
        keywords: ["探索", "头脑风暴", "想法"]
        file_patterns: []

  - id: workflow-new
    name: Workflow New
    description: Create a new requirement work item
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: new
        keywords: ["新建", "需求"]
        file_patterns: ["requirements/REQ-*.md"]

  - id: workflow-confirm
    name: Workflow Confirm
    description: Confirm a draft requirement before planning
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: confirm
        keywords: ["确认", "澄清"]
        file_patterns: ["requirements/REQ-*.md"]

  - id: workflow-plan
    name: Workflow Plan
    description: Create a technical plan for an accepted requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: plan
        keywords: ["规划", "方案"]
        file_patterns: ["requirements/REQ-*.md", "plans/REQ-*-plan.md"]

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
        file_patterns: ["plans/REQ-*-plan.md", "implementations/REQ-*-implementation.md"]

  - id: workflow-check
    name: Workflow Check
    description: Verify an implemented requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: check
        keywords: ["验证", "检查"]
        file_patterns: ["implementations/REQ-*-implementation.md"]

  - id: workflow-archive
    name: Workflow Archive
    description: Archive a verified requirement
    side_effects:
      - writes_file
    safety_level: write-workflow-only
    triggers:
      - intent: archive
        keywords: ["归档", "关闭"]
        file_patterns: ["requirements/REQ-*.md"]
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
capabilities: []
history:
  - date: 2026-06-21
    from: null
    to: draft
    note: Created
  - date: 2026-06-21
    from: draft
    to: accepted
    note: Accepted
---

# REQ-0002: Orchestration requirement

Original requirement text.
`;

const planContent = `# REQ-0002 技术方案

## 1. 目标

目标内容。

## 2. 非目标

- 不做。

## 3. 改动范围

### 文件 / 模块

- 文件。

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

回滚方式：

- 回滚。

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
  const root = await mkdtemp(join(tmpdir(), "workflow-orchestrator-"));
  await mkdir(join(root, "orchestration"));
  await mkdir(join(root, "audit", "executions"), { recursive: true });
  await mkdir(join(root, "requirements"));
  await mkdir(join(root, "plans"));
  await writeFile(
    join(root, "orchestration", "skill-registry.yaml"),
    skillRegistryYaml,
  );
  await writeFile(
    join(root, "orchestration", "execution-policies.yaml"),
    executionPoliciesYaml,
  );
  await writeFile(
    join(root, "requirements", "REQ-0002.md"),
    requirementContent(
      options.status ?? "accepted",
      options.planRequired ?? true,
    ),
  );
  if (options.withPlan !== false) {
    await writeFile(join(root, "plans", "REQ-0002-plan.md"), planContent);
  }
  await writeFile(join(root, "current.md"), currentTemplate);
  await writeFile(join(root, "project.md"), "# Project\n");
  return root;
}

// Tests

test("loadSkillRegistry reads and parses skill registry", async () => {
  const root = await orchestrationFixture();
  const registry = await loadSkillRegistry(root);
  assert.equal(registry.skills.length, 7);
  assert.equal(registry.skills[0].id, "workflow-brainstorm");
  assert.deepEqual(registry.skills[0].side_effects, ["writes_file"]);
  assert.equal(registry.skills[1].safety_level, "write-workflow-only");
});

test("loadSkillRegistry throws when registry is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-empty-"));
  await assert.rejects(loadSkillRegistry(root), /Skill registry not found/);
});

test("loadExecutionPolicies reads and parses policies", async () => {
  const root = await orchestrationFixture();
  const policies = await loadExecutionPolicies(root);
  assert.equal(policies.policies.length, 2);
  assert.equal(policies.policies[0].skill, "*");
  assert.equal(policies.policies[1].skill, "workflow-*");
  assert.equal(policies.policies[1].human_confirm, true);
});

test("loadExecutionPolicies throws when policies file is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-empty-"));
  await assert.rejects(
    loadExecutionPolicies(root),
    /Execution policies not found/,
  );
});

test("loadOrchestrationContext reads requirement, plan, current, and project", async () => {
  const root = await orchestrationFixture();
  const context = await loadOrchestrationContext(root, "REQ-0002");
  assert.equal(context.reqId, "REQ-0002");
  assert.equal(context.requirement.data.id, "REQ-0002");
  assert.equal(context.requirement.data.status, "accepted");
  assert.ok(context.plan);
  assert.equal(context.plan.filename, "REQ-0002-plan");
  assert.ok(context.current);
  assert.ok(context.project);
});

test("loadOrchestrationContext throws when requirement is missing", async () => {
  const root = await orchestrationFixture();
  await assert.rejects(
    loadOrchestrationContext(root, "REQ-9999"),
    /Requirement REQ-9999 does not exist/,
  );
});

test("loadOrchestrationContext sets plan to null when plan is missing", async () => {
  const root = await orchestrationFixture({ withPlan: false });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  assert.equal(context.plan, null);
});

test("inferNextStep recommends workflow-confirm when status is draft", async () => {
  const root = await orchestrationFixture({ status: "draft" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-confirm");
  assert.equal(
    step.reason,
    "Requirement is draft; recommend confirmation and clarification.",
  );
});

test("inferNextStep recommends workflow-plan when status is accepted and plan exists", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-plan");
  assert.equal(
    step.reason,
    "Requirement is accepted; plan exists, recommend planning to refine or proceed.",
  );
});

test("inferNextStep recommends workflow-plan when status is accepted and plan is missing", async () => {
  const root = await orchestrationFixture({
    status: "accepted",
    withPlan: false,
  });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-plan");
  assert.equal(
    step.reason,
    "Requirement is accepted but no plan exists; recommend planning first.",
  );
});

test("inferNextStep recommends workflow-exec when status is accepted and plan is skipped", async () => {
  const root = await orchestrationFixture({
    status: "accepted",
    planRequired: false,
  });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-exec");
  assert.equal(
    step.reason,
    "Requirement is accepted and plan is skipped; recommend execution.",
  );
});

test("inferNextStep recommends workflow-exec when status is planned", async () => {
  const root = await orchestrationFixture({ status: "planned" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-exec");
  assert.equal(step.reason, "Requirement is planned; recommend execution.");
});

test("inferNextStep recommends workflow-check when status is implemented", async () => {
  const root = await orchestrationFixture({ status: "implemented" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-check");
  assert.equal(
    step.reason,
    "Requirement is implemented; recommend verification check.",
  );
});

test("inferNextStep recommends workflow-archive when status is verified", async () => {
  const root = await orchestrationFixture({ status: "verified" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-archive");
  assert.equal(step.reason, "Requirement is verified; recommend archiving.");
});

test("inferNextStep returns compact recommendation when status is archived", async () => {
  const root = await orchestrationFixture({ status: "archived" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, null);
  assert.equal(
    step.reason,
    "Requirement is archived; recommend compacting or starting a new session.",
  );
});

test("inferNextStep returns null for canceled status", async () => {
  const root = await orchestrationFixture({ status: "canceled" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step, null);
});

test("inferNextStep returns null for superseded status", async () => {
  const root = await orchestrationFixture({ status: "superseded" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step, null);
});

test("inferNextStep returns null for blocked status", async () => {
  const root = await orchestrationFixture({ status: "blocked" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step, null);
});

test("inferNextStep recommends workflow-confirm for reopened status", async () => {
  const root = await orchestrationFixture({ status: "reopened" });
  const context = await loadOrchestrationContext(root, "REQ-0002");
  const step = inferNextStep(context);
  assert.equal(step.skillId, "workflow-confirm");
  assert.equal(
    step.reason,
    "Requirement is reopened; recommend confirmation to reassess.",
  );
});

test("resolvePolicy returns matching policy for skill", async () => {
  const root = await orchestrationFixture();
  const policies = await loadExecutionPolicies(root);
  const policy = resolvePolicy(policies, "workflow-exec");
  assert.equal(policy.auto_execute, false);
  assert.equal(policy.human_confirm, true);
  assert.equal(policy.audit_level, "detailed");
});

test("resolvePolicy falls back to wildcard policy", async () => {
  const root = await orchestrationFixture();
  const policies = await loadExecutionPolicies(root);
  const policy = resolvePolicy(policies, "workflow-check");
  assert.equal(policy.auto_execute, false);
  assert.equal(policy.human_confirm, true);
  assert.equal(policy.audit_level, "detailed");
});

test("resolvePolicy falls back to default when no match", async () => {
  const root = await orchestrationFixture();
  const policies = await loadExecutionPolicies(root);
  // Remove wildcard
  policies.policies = policies.policies.filter((p) => p.skill !== "*");
  const policy = resolvePolicy(policies, "unknown:skill");
  assert.equal(policy.auto_execute, false);
  assert.equal(policy.human_confirm, true);
  assert.equal(policy.audit_level, "detailed");
});

test("generateExecutionId produces unique IDs with timestamp format", async () => {
  const id1 = generateExecutionId();
  const id2 = generateExecutionId();
  assert.ok(id1.startsWith("exec-"));
  assert.notEqual(id1, id2);
  assert.ok(/exec-\d{8}-\d{6}-[a-f0-9]{8}/.test(id1));
});

test("writeAuditLog writes structured YAML audit file", async () => {
  const root = await orchestrationFixture();
  const executionId = "exec-test-001";
  const audit = {
    execution_id: executionId,
    requirement: "requirements/REQ-0002.md",
    plan: "plans/REQ-0002-plan.md",
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
        timestamps: {
          started: "2026-06-21T10:00:00Z",
          completed: "2026-06-21T10:05:00Z",
        },
      },
    ],
  };
  const logPath = await writeAuditLog(root, audit);
  const content = await readFile(logPath, "utf8");
  assert.ok(content.includes("execution_id: exec-test-001"));
  assert.ok(content.includes("status: completed"));
  assert.ok(content.includes("skill: workflow-plan"));
  assert.ok(content.includes("human_confirmed: true"));
  assert.ok(logPath.includes("audit/executions/"));
});

test("runOrchestration approves skill execution when confirmed", async () => {
  const root = await orchestrationFixture({ status: "implemented" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: true });
  assert.equal(result.reqId, "REQ-0002");
  assert.equal(result.status, "approved");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].skill, "workflow-check");
  assert.equal(result.steps[0].auto_executed, false);
  assert.equal(result.steps[0].human_confirmed, true);
  assert.equal(result.steps[0].status, "approved");
});

test("runOrchestration requires human confirmation for write-side-effect skill", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: false });
  assert.equal(result.status, "paused");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].skill, "workflow-plan");
  assert.equal(result.steps[0].status, "paused");
  assert.equal(result.steps[0].auto_executed, false);
  assert.equal(result.steps[0].human_confirmed, false);
});

test("runOrchestration approves write-side-effect skill when confirmed", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: true });
  assert.equal(result.status, "approved");
  assert.equal(result.steps[0].status, "approved");
  assert.equal(result.steps[0].human_confirmed, true);
});

test("runOrchestration returns no-op when no next step is inferred", async () => {
  const root = await orchestrationFixture({ status: "archived" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: true });
  assert.equal(result.status, "no-op");
  assert.equal(result.steps.length, 0);
});

test("runOrchestration writes audit log for completed execution", async () => {
  const root = await orchestrationFixture({ status: "implemented" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: true });
  const auditDir = join(root, "audit", "executions");
  const files = await readdir(auditDir);
  assert.ok(files.length > 0);
  const logFile = join(auditDir, files[0]);
  const content = await readFile(logFile, "utf8");
  assert.ok(content.includes(result.execution_id));
  assert.ok(content.includes("workflow-check"));
});

test("runOrchestration writes audit log for paused execution", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: false });
  const auditDir = join(root, "audit", "executions");
  const files = await readdir(auditDir);
  assert.ok(files.length > 0);
  const logFile = join(auditDir, files[0]);
  const content = await readFile(logFile, "utf8");
  assert.ok(content.includes(result.execution_id));
  assert.ok(content.includes("paused"));
});

test("runOrchestration throws when requirement does not exist", async () => {
  const root = await orchestrationFixture();
  await assert.rejects(
    runOrchestration(root, "REQ-9999", { confirm: true }),
    /Requirement REQ-9999 does not exist/,
  );
});

test("resolvePolicy falls back to default policy for unknown skill", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  // Add an unknown skill to the registry, then test resolvePolicy directly
  const registry = await loadSkillRegistry(root);
  registry.skills.push({
    id: "custom:unknown",
    name: "Unknown",
    description: "Unknown skill",
    side_effects: ["none"],
    safety_level: "read-only",
    triggers: [{ intent: "unknown" }],
  });
  const policies = await loadExecutionPolicies(root);
  const policy = resolvePolicy(policies, "custom:unknown");
  assert.equal(policy.auto_execute, false);
  assert.equal(policy.human_confirm, true);
});

test("runOrchestration throws when inferred skill is not registered", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  // Remove workflow-plan from registry so inferNextStep recommends an unregistered skill
  const registry = await loadSkillRegistry(root);
  registry.skills = registry.skills.filter((s) => s.id !== "workflow-plan");
  await writeFile(
    join(root, "orchestration", "skill-registry.yaml"),
    stringifyYaml(registry),
  );
  await assert.rejects(
    runOrchestration(root, "REQ-0002"),
    /Skill workflow-plan is not registered/,
  );
});

test("runOrchestration audit log includes side effects", async () => {
  const root = await orchestrationFixture({ status: "accepted" });
  const result = await runOrchestration(root, "REQ-0002", { confirm: true });
  const auditDir = join(root, "audit", "executions");
  const files = await readdir(auditDir);
  const logFile = join(auditDir, files[0]);
  const content = await readFile(logFile, "utf8");
  assert.ok(content.includes("writes_file"));
});

test("loadOrchestrationContext reads current.md and project.md content", async () => {
  const root = await orchestrationFixture();
  const context = await loadOrchestrationContext(root, "REQ-0002");
  assert.ok(context.current.includes("Current Workflow Context"));
  assert.ok(context.project.includes("# Project"));
});

test("writeAuditLog creates audit directory if missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-audit-"));
  const audit = {
    execution_id: "exec-test-002",
    requirement: "requirements/REQ-0002.md",
    plan: null,
    trigger: { type: "explicit_command", input: "--orchestrate REQ-0002" },
    status: "no-op",
    steps: [],
  };
  const logPath = await writeAuditLog(root, audit);
  const content = await readFile(logPath, "utf8");
  assert.ok(content.includes("exec-test-002"));
});
