import { access, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { loadChanges, workflowPaths } from "./validator.js";

function workflowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

const REQ_ID_PATTERN = /^REQ-[0-9]{4}$/;

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function loadYamlFile(path) {
  const content = await readFile(path, "utf8");
  return parseYaml(content, { uniqueKeys: true });
}

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function elapsedMs(startedMs) {
  return Math.max(0, Date.now() - startedMs);
}

function projectRootFor(workflowRoot) {
  return basename(workflowRoot) === ".workflow" ? dirname(workflowRoot) : workflowRoot;
}

function resolveSkillSourcePath(workflowRoot, sourcePath) {
  if (!sourcePath) return null;
  return isAbsolute(sourcePath)
    ? sourcePath
    : join(projectRootFor(workflowRoot), sourcePath);
}

function isInsideProject(workflowRoot, path) {
  const projectRoot = resolve(projectRootFor(workflowRoot));
  const candidate = resolve(path);
  const relativePath = relative(projectRoot, candidate);
  return relativePath === "" || !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

async function hashFile(path) {
  const content = await readFile(path);
  return "sha256:" + createHash("sha256").update(content).digest("hex");
}

async function buildSkillProvenance(workflowRoot, skill, sideEffects) {
  const sourcePath = skill.source_path ??
    skill.sourcePath ??
    await inferProjectSkillSourcePath(workflowRoot, skill.id);
  const provenance = {
    id: skill.id,
    name: skill.name ?? null,
    version: skill.version ?? null,
    source_path: sourcePath,
    content_hash: null,
    provenance_captured: false,
    safety_level: skill.safety_level ?? null,
    side_effects: sideEffects,
  };

  if (!sourcePath) {
    provenance.provenance_error = "source_path_missing";
    return provenance;
  }

  const resolvedSourcePath = resolveSkillSourcePath(workflowRoot, sourcePath);
  if (!isInsideProject(workflowRoot, resolvedSourcePath)) {
    provenance.provenance_error = "source_path_outside_project";
    return provenance;
  }

  try {
    provenance.content_hash = await hashFile(resolvedSourcePath);
    provenance.provenance_captured = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    provenance.provenance_error = "source_not_found";
  }

  return provenance;
}

async function inferProjectSkillSourcePath(workflowRoot, skillId) {
  for (const sourcePath of [
    ".codex/skills/" + skillId + "/SKILL.md",
    ".claude/skills/" + skillId + "/SKILL.md",
  ]) {
    if (await fileExists(resolveSkillSourcePath(workflowRoot, sourcePath))) {
      return sourcePath;
    }
  }
  return null;
}

function finishStepRecord(stepRecord, startedMs) {
  stepRecord.timestamps.completed = nowIso();
  stepRecord.workflow_decision_duration_ms = elapsedMs(startedMs);
}

function finishAuditRecord(audit, startedMs, status) {
  audit.status = status;
  audit.completed_at = nowIso();
  audit.workflow_decision_duration_ms = elapsedMs(startedMs);
}

function artifactPath(record, filename) {
  return join(record.changeDir, filename);
}

function projectRelativeArtifact(record, filename) {
  const prefix = record.archived ? "docs/changes/archive/" : "docs/changes/";
  return prefix + record.filename + "/" + filename;
}

async function readRequirement(workflowRoot, reqId) {
  const changes = await loadChanges(workflowPaths(workflowRoot));
  const requirement = changes.find(
    (record) => !record.error && record.data.id === reqId,
  );
  if (!requirement)
    throw workflowError(
      "WF_REQUIREMENT_MISSING",
      "Requirement " + reqId + " does not exist.",
    );
  return requirement;
}

export async function loadSkillRegistry(workflowRoot) {
  const path = join(workflowRoot, "orchestration", "skill-registry.yaml");
  if (!(await fileExists(path))) {
    throw workflowError("WF_REGISTRY_MISSING", "Skill registry not found.");
  }
  return loadYamlFile(path);
}

export async function loadExecutionPolicies(workflowRoot) {
  const path = join(workflowRoot, "orchestration", "execution-policies.yaml");
  if (!(await fileExists(path))) {
    throw workflowError("WF_POLICIES_MISSING", "Execution policies not found.");
  }
  return loadYamlFile(path);
}

export async function loadOrchestrationContext(workflowRoot, reqId) {
  const [requirement, current, project] = await Promise.all([
    readRequirement(workflowRoot, reqId),
    readFile(join(workflowRoot, "current.md"), "utf8").catch(() => null),
    readFile(join(workflowRoot, "project.md"), "utf8").catch(() => null),
  ]);

  const designPath = artifactPath(requirement, "design.md");
  const plan = (await fileExists(designPath))
    ? {
        path: designPath,
        filename: "design",
        content: await readFile(designPath, "utf8"),
      }
    : null;
  const artifacts = {
    proposal: projectRelativeArtifact(requirement, "proposal.md"),
    design: (await fileExists(designPath))
      ? projectRelativeArtifact(requirement, "design.md")
      : null,
    tasks: (await fileExists(artifactPath(requirement, "tasks.md")))
      ? projectRelativeArtifact(requirement, "tasks.md")
      : null,
    implementation: (await fileExists(artifactPath(requirement, "implementation.md")))
      ? projectRelativeArtifact(requirement, "implementation.md")
      : null,
    verification: (await fileExists(artifactPath(requirement, "verification.md")))
      ? projectRelativeArtifact(requirement, "verification.md")
      : null,
  };

  return {
    reqId,
    requirement,
    plan,
    artifacts,
    current,
    project,
  };
}

export function inferNextStep(context) {
  const status = context.requirement.data.status;
  const hasPlan = context.plan !== null;

  switch (status) {
    case "canceled":
    case "superseded":
    case "blocked":
      return null;
    case "draft":
      return {
        skillId: "workflow-confirm",
        reason:
          "Requirement is draft; recommend confirmation and clarification.",
      };
    case "accepted": {
      if (context.requirement.data.plan_required === false) {
        return {
          skillId: "workflow-exec",
          reason:
            "Requirement is accepted and plan is skipped; recommend execution.",
        };
      }
      if (!hasPlan) {
        return {
          skillId: "workflow-plan",
          reason:
            "Requirement is accepted but no plan exists; recommend planning first.",
        };
      }
      return {
        skillId: "workflow-plan",
        reason:
          "Requirement is accepted; plan exists, recommend planning to refine or proceed.",
      };
    }
    case "planned":
      return {
        skillId: "workflow-exec",
        reason: "Requirement is planned; recommend execution.",
      };
    case "implemented":
      return {
        skillId: "workflow-check",
        reason: "Requirement is implemented; recommend verification check.",
      };
    case "verified":
      return {
        skillId: "workflow-archive",
        reason: "Requirement is verified; recommend archiving.",
      };
    case "archived":
      return {
        skillId: null,
        reason:
          "Requirement is archived; recommend compacting or starting a new session.",
      };
    case "reopened":
      return {
        skillId: "workflow-confirm",
        reason: "Requirement is reopened; recommend confirmation to reassess.",
      };
    default:
      return null;
  }
}

export function resolvePolicy(policies, skillId) {
  const defaultPolicy = {
    auto_execute: false,
    human_confirm: true,
    audit_level: "detailed",
  };

  if (!Array.isArray(policies.policies)) return defaultPolicy;

  const exact = policies.policies.find((p) => p.skill === skillId);
  if (exact) {
    return {
      auto_execute: exact.auto_execute ?? defaultPolicy.auto_execute,
      human_confirm: exact.human_confirm ?? defaultPolicy.human_confirm,
      audit_level: exact.audit_level ?? defaultPolicy.audit_level,
    };
  }

  const suffixWildcard = policies.policies.find((p) => {
    if (!p.skill.endsWith("-*")) return false;
    const prefix = p.skill.slice(0, -2);
    return skillId.startsWith(prefix);
  });
  if (suffixWildcard) {
    return {
      auto_execute: suffixWildcard.auto_execute ?? defaultPolicy.auto_execute,
      human_confirm:
        suffixWildcard.human_confirm ?? defaultPolicy.human_confirm,
      audit_level: suffixWildcard.audit_level ?? defaultPolicy.audit_level,
    };
  }

  const prefix = skillId.split(":")[0];
  const wildcard = policies.policies.find((p) => p.skill === prefix + ":*");
  if (wildcard) {
    return {
      auto_execute: wildcard.auto_execute ?? defaultPolicy.auto_execute,
      human_confirm: wildcard.human_confirm ?? defaultPolicy.human_confirm,
      audit_level: wildcard.audit_level ?? defaultPolicy.audit_level,
    };
  }

  const global = policies.policies.find((p) => p.skill === "*");
  if (global) {
    return {
      auto_execute: global.auto_execute ?? defaultPolicy.auto_execute,
      human_confirm: global.human_confirm ?? defaultPolicy.human_confirm,
      audit_level: global.audit_level ?? defaultPolicy.audit_level,
    };
  }

  return defaultPolicy;
}

export function generateExecutionId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = "" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  return "exec-" + timestamp + "-" + randomUUID().split("-")[0];
}

export async function writeAuditLog(workflowRoot, audit) {
  const auditDir = join(workflowRoot, "audit", "executions");
  await mkdir(auditDir, { recursive: true });
  const filename = audit.execution_id + ".yaml";
  const path = join(auditDir, filename);
  await writeFile(path, stringifyYaml(audit), "utf8");
  return path;
}

const AUDIT_LIMITATIONS = [
  "agent_runtime_not_invoked",
  "token_usage_not_captured",
  "cost_not_estimated",
  "tool_calls_not_captured",
];

async function readExecutionAudits(workflowRoot) {
  const auditDir = join(workflowRoot, "audit", "executions");
  let files;
  try {
    files = await readdir(auditDir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const audits = [];
  for (const file of files.filter((entry) => entry.endsWith(".yaml")).sort()) {
    const path = join(auditDir, file);
    const audit = await loadYamlFile(path);
    audits.push({ path, audit });
  }
  return audits;
}

function auditMatchesRequirement(audit, reqId) {
  return audit.requirement_id === reqId ||
    typeof audit.requirement === "string" && audit.requirement.includes(reqId);
}

function flattenAuditStep(step) {
  const provenance = step.skill_provenance ?? {};
  return {
    step: step.step,
    skill: typeof step.skill === "string" ? step.skill : provenance.id,
    status: step.status,
    human_confirmed: step.human_confirmed ?? false,
    auto_executed: step.auto_executed ?? false,
    workflow_decision_duration_ms: step.workflow_decision_duration_ms ?? null,
    skill_source_path: provenance.source_path ?? null,
    skill_content_hash: provenance.content_hash ?? null,
  };
}

export async function loadAuditSummary(workflowRoot, reqId) {
  if (!REQ_ID_PATTERN.test(reqId)) {
    throw workflowError("WF_REQ_ID_INVALID", "Invalid requirement ID: " + reqId);
  }

  const matchingAudits = (await readExecutionAudits(workflowRoot))
    .filter(({ audit }) => auditMatchesRequirement(audit, reqId));

  const executions = matchingAudits.map(({ audit }) => ({
    execution_id: audit.execution_id,
    status: audit.status,
    started_at: audit.started_at ?? null,
    completed_at: audit.completed_at ?? null,
    workflow_decision_duration_ms: audit.workflow_decision_duration_ms ?? null,
    steps: Array.isArray(audit.steps) ? audit.steps.map(flattenAuditStep) : [],
  }));

  const totals = {
    executions: executions.length,
    steps: 0,
    approved_steps: 0,
    completed_steps: 0,
    paused_steps: 0,
    workflow_decision_duration_ms: 0,
  };
  const skillInvocations = {};

  for (const execution of executions) {
    totals.workflow_decision_duration_ms += execution.workflow_decision_duration_ms ?? 0;
    for (const step of execution.steps) {
      totals.steps += 1;
      if (step.status === "approved") totals.approved_steps += 1;
      if (step.status === "completed") totals.completed_steps += 1;
      if (step.status === "paused") totals.paused_steps += 1;
      if (step.skill) skillInvocations[step.skill] = (skillInvocations[step.skill] ?? 0) + 1;
    }
  }

  return {
    reqId,
    audit_scope: "workflow_decision",
    agent_execution: {
      captured: false,
      reason: "external_agent_runtime_not_invoked",
    },
    totals,
    skill_invocations: skillInvocations,
    executions,
    limitations: AUDIT_LIMITATIONS,
  };
}

export function formatAuditSummary(summary) {
  const lines = [
    "Audit summary for " + summary.reqId,
    "Audit scope: " + summary.audit_scope,
    "Agent runtime: " + (summary.agent_execution?.captured ? "captured" : "not captured"),
    "Token usage: not captured",
    "Cost: not estimated",
    "Tool calls: not captured",
    "",
    "Totals:",
    "- executions: " + summary.totals.executions,
    "- steps: " + summary.totals.steps,
    "- approved steps: " + summary.totals.approved_steps,
    "- completed steps: " + summary.totals.completed_steps,
    "- paused steps: " + summary.totals.paused_steps,
    "- workflow decision duration ms: " + summary.totals.workflow_decision_duration_ms,
    "",
    "Skill invocations:",
  ];

  const skillEntries = Object.entries(summary.skill_invocations);
  if (skillEntries.length === 0) lines.push("- none");
  else for (const [skill, count] of skillEntries) lines.push("- " + skill + ": " + count);

  lines.push("", "Executions:");
  if (summary.executions.length === 0) lines.push("- none");
  for (const execution of summary.executions) {
    lines.push(
      "- " + execution.execution_id +
        " status=" + execution.status +
        " duration_ms=" + (execution.workflow_decision_duration_ms ?? "unknown"),
    );
    for (const step of execution.steps) {
      lines.push(
        "  - step " + step.step +
          " skill=" + step.skill +
          " status=" + step.status +
          " human_confirmed=" + step.human_confirmed +
          " auto_executed=" + step.auto_executed +
          " duration_ms=" + (step.workflow_decision_duration_ms ?? "unknown"),
      );
      if (step.skill_source_path || step.skill_content_hash) {
        lines.push(
          "    source=" + (step.skill_source_path ?? "unknown") +
            " hash=" + (step.skill_content_hash ?? "unknown"),
        );
      }
    }
  }

  lines.push("", "Limitations:");
  for (const limitation of summary.limitations) lines.push("- " + limitation);

  return lines.join("\n");
}

export async function runOrchestration(workflowRoot, reqId, options = {}) {
  const { confirm = false } = options;
  const auditStartedMs = Date.now();

  if (!REQ_ID_PATTERN.test(reqId)) {
    throw workflowError("WF_REQ_ID_INVALID", "Invalid requirement ID: " + reqId);
  }

  const context = await loadOrchestrationContext(workflowRoot, reqId);
  const registry = await loadSkillRegistry(workflowRoot);
  const policies = await loadExecutionPolicies(workflowRoot);

  const step = inferNextStep(context);

  const executionId = generateExecutionId();
  const audit = {
    execution_id: executionId,
    requirement_id: reqId,
    execution_scope: "workflow_decision",
    requirement: context.artifacts.proposal,
    plan: context.artifacts.design,
    artifacts: context.artifacts,
    started_at: nowIso(auditStartedMs),
    completed_at: null,
    workflow_decision_duration_ms: null,
    agent_execution: {
      captured: false,
      reason: "external_agent_runtime_not_invoked",
      usage_captured: false,
      cost_captured: false,
      tool_calls_captured: false,
    },
    trigger: {
      type: "explicit_command",
      input: "--orchestrate " + reqId,
    },
    status: "in_progress",
    steps: [],
  };

  if (!step || step.skillId === null) {
    finishAuditRecord(audit, auditStartedMs, "no-op");
    await writeAuditLog(workflowRoot, audit);
    return {
      execution_id: executionId,
      reqId,
      status: "no-op",
      steps: [],
    };
  }

  const skill = registry.skills.find((s) => s.id === step.skillId);
  if (!skill) {
    throw workflowError("WF_SKILL_UNREGISTERED", "Skill " + step.skillId + " is not registered.");
  }
  const policy = resolvePolicy(policies, step.skillId);

  const sideEffects = skill?.side_effects ?? ["none"];
  const hasWriteSideEffects = sideEffects.some(
    (se) => se !== "none" && se !== "reads_file",
  );
  const stepStartedMs = Date.now();

  const stepRecord = {
    step: 1,
    skill: step.skillId,
    skill_provenance: await buildSkillProvenance(workflowRoot, skill, sideEffects),
    status: "in_progress",
    auto_executed: false,
    human_confirmed: false,
    input_summary: step.reason,
    output_summary: null,
    side_effects: sideEffects,
    timestamps: {
      started: nowIso(stepStartedMs),
      completed: null,
    },
    workflow_decision_duration_ms: null,
  };

  audit.steps.push(stepRecord);

  if (!policy.auto_execute || hasWriteSideEffects) {
    if (!confirm) {
      stepRecord.status = "paused";
      finishStepRecord(stepRecord, stepStartedMs);
      finishAuditRecord(audit, auditStartedMs, "paused");
      await writeAuditLog(workflowRoot, audit);
      return {
        execution_id: executionId,
        reqId,
        status: "paused",
        steps: audit.steps,
      };
    }
    stepRecord.human_confirmed = true;
  }

  stepRecord.auto_executed = policy.auto_execute && !hasWriteSideEffects;
  finishStepRecord(stepRecord, stepStartedMs);

  if (stepRecord.auto_executed) {
    stepRecord.status = "completed";
    stepRecord.output_summary = "Skill " + step.skillId + " auto-executed for " + reqId + ".";
    finishAuditRecord(audit, auditStartedMs, "completed");
  } else {
    stepRecord.status = "approved";
    stepRecord.output_summary = "Skill " + step.skillId + " approved for execution for " + reqId + ".";
    finishAuditRecord(audit, auditStartedMs, "approved");
  }

  await writeAuditLog(workflowRoot, audit);

  return {
    execution_id: executionId,
    reqId,
    status: audit.status,
    steps: audit.steps,
  };
}
