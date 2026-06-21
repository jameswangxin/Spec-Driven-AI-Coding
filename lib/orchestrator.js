import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
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

export async function runOrchestration(workflowRoot, reqId, options = {}) {
  const { confirm = false } = options;

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
    requirement: context.artifacts.proposal,
    plan: context.artifacts.design,
    artifacts: context.artifacts,
    trigger: {
      type: "explicit_command",
      input: "--orchestrate " + reqId,
    },
    status: "in_progress",
    steps: [],
  };

  if (!step || step.skillId === null) {
    audit.status = "no-op";
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

  const stepRecord = {
    step: 1,
    skill: step.skillId,
    status: "in_progress",
    auto_executed: false,
    human_confirmed: false,
    input_summary: step.reason,
    output_summary: null,
    side_effects: sideEffects,
    timestamps: {
      started: new Date().toISOString(),
      completed: null,
    },
  };

  audit.steps.push(stepRecord);

  if (!policy.auto_execute || hasWriteSideEffects) {
    if (!confirm) {
      stepRecord.status = "paused";
      audit.status = "paused";
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
  stepRecord.timestamps.completed = new Date().toISOString();

  if (stepRecord.auto_executed) {
    stepRecord.status = "completed";
    stepRecord.output_summary = "Skill " + step.skillId + " auto-executed for " + reqId + ".";
    audit.status = "completed";
  } else {
    stepRecord.status = "approved";
    stepRecord.output_summary = "Skill " + step.skillId + " approved for execution for " + reqId + ".";
    audit.status = "approved";
  }

  await writeAuditLog(workflowRoot, audit);

  return {
    execution_id: executionId,
    reqId,
    status: audit.status,
    steps: audit.steps,
  };
}
