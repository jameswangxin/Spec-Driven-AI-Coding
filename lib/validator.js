import {
  access,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";

const REQUIREMENT_SCHEMA = JSON.parse(
  await readFile(
    new URL("../.workflow/schema/requirement.schema.json", import.meta.url),
    "utf8",
  ),
);

const ajv = new Ajv2020({ allErrors: true });
const validateRequirement = ajv.compile(REQUIREMENT_SCHEMA);

const PLAN_REQUIRED_COMPLEXITIES = new Set(["medium", "complex"]);
const RISK_TAGS = new Set([
  "data",
  "security",
  "migration",
  "external-api",
  "architecture",
  "cross-module",
]);
const TRANSITIONS = {
  draft: new Set(["accepted", "canceled", "superseded"]),
  accepted: new Set(["planned", "blocked", "canceled", "superseded"]),
  planned: new Set(["implemented", "blocked", "canceled", "superseded"]),
  implemented: new Set(["verified", "blocked", "canceled"]),
  blocked: new Set(["accepted", "planned", "implemented"]),
  verified: new Set(["archived", "reopened"]),
  reopened: new Set(["planned", "implemented", "verified"]),
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_DIR = /^(REQ-\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARCHIVE_DIR = /^(\d{4}-\d{2}-\d{2})-(REQ-\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DESIGN_REQUIRED_SECTIONS = [
  { name: "目标", pattern: /^##\s*(?:\d+\.\s*)?目标\s*$/m },
  { name: "非目标", pattern: /^##\s*(?:\d+\.\s*)?非目标\s*$/m },
  { name: "改动范围", pattern: /^##\s*(?:\d+\.\s*)?改动范围\s*$/m },
  { name: "方案设计", pattern: /^##\s*(?:\d+\.\s*)?方案设计\s*$/m },
  { name: "数据流 / 调用链路", pattern: /^##\s*(?:\d+\.\s*)?数据流\s*\/\s*调用链路\s*$/m },
  { name: "接口 / 数据结构变化", pattern: /^##\s*(?:\d+\.\s*)?接口\s*\/\s*数据结构变化\s*$/m },
  { name: "兼容性与迁移", pattern: /^##\s*(?:\d+\.\s*)?兼容性与迁移\s*$/m },
  { name: "风险与回滚", pattern: /^##\s*(?:\d+\.\s*)?风险与回滚\s*$/m },
  { name: "测试策略", pattern: /^##\s*(?:\d+\.\s*)?测试策略\s*$/m },
  { name: "实施步骤", pattern: /^##\s*(?:\d+\.\s*)?实施步骤\s*$/m },
];

const TASKS_REQUIRED_SECTIONS = [
  { name: "任务", pattern: /^##\s*(?:\d+\.\s*)?任务\s*$/m },
];

const IMPLEMENTATION_REQUIRED_SECTIONS = [
  { name: "实际改动范围", pattern: /^##\s*(?:\d+\.\s*)?实际改动范围\s*$/m },
  { name: "与方案的偏差", pattern: /^##\s*(?:\d+\.\s*)?与方案的偏差\s*$/m },
  { name: "测试记录", pattern: /^##\s*(?:\d+\.\s*)?测试记录\s*$/m },
  { name: "自审结果", pattern: /^##\s*(?:\d+\.\s*)?自审结果\s*$/m },
  { name: "残余风险", pattern: /^##\s*(?:\d+\.\s*)?残余风险\s*$/m },
  { name: "后续事项", pattern: /^##\s*(?:\d+\.\s*)?后续事项\s*$/m },
  { name: "Commit / PR", pattern: /^##\s*(?:\d+\.\s*)?Commit\s*\/\s*PR\s*$/m },
  { name: "经验总结", pattern: /^##\s*(?:\d+\.\s*)?经验总结\s*$/m },
];

const VERIFICATION_REQUIRED_SECTIONS = [
  { name: "验证记录", pattern: /^##\s*(?:\d+\.\s*)?验证记录\s*$/m },
  { name: "残余风险", pattern: /^##\s*(?:\d+\.\s*)?残余风险\s*$/m },
];

const ACTIVE_STATUSES = new Set([
  "draft",
  "accepted",
  "planned",
  "implemented",
  "blocked",
  "reopened",
]);

export function workflowPaths(workflowRoot) {
  const projectRoot = dirname(workflowRoot);
  const docsRoot = join(projectRoot, "docs");
  return {
    projectRoot,
    workflowRoot,
    docsRoot,
    changesRoot: join(docsRoot, "changes"),
    archiveRoot: join(docsRoot, "changes", "archive"),
    specsRoot: join(docsRoot, "specs"),
  };
}

function isDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isDatePath(instancePath) {
  return (
    instancePath === "/created_at" ||
    instancePath === "/updated_at" ||
    /^\/history\/\d+\/date$/.test(instancePath)
  );
}

function parseFrontmatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/);
  if (!match) throw new Error("Expected YAML frontmatter enclosed by ---");
  return parseYaml(match[1], { uniqueKeys: true });
}

function workflowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function readDirectory(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function loadMarkdownFile(path, filename) {
  const content = await readFile(path, "utf8");
  return { path, filename, content };
}

async function loadProposal(changeDir, filename, archived) {
  const path = join(changeDir, "proposal.md");
  const source = await readFile(path, "utf8");
  try {
    return {
      path,
      filename,
      changeDir,
      archived,
      content: source,
      data: parseFrontmatter(source),
    };
  } catch (error) {
    return { path, filename, changeDir, archived, error };
  }
}

export async function loadChanges(paths) {
  const activeEntries = (await readDirectory(paths.changesRoot))
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => ({
      filename: entry.name,
      changeDir: join(paths.changesRoot, entry.name),
      archived: false,
    }));

  const archivedEntries = (await readDirectory(paths.archiveRoot))
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      filename: entry.name,
      changeDir: join(paths.archiveRoot, entry.name),
      archived: true,
    }));

  const entries = [...activeEntries, ...archivedEntries];
  return Promise.all(
    entries.map(async (entry) => {
      if (!(await fileExists(join(entry.changeDir, "proposal.md")))) {
        return {
          path: join(entry.changeDir, "proposal.md"),
          filename: entry.filename,
          changeDir: entry.changeDir,
          archived: entry.archived,
          error: new Error("Missing proposal.md"),
        };
      }
      return loadProposal(entry.changeDir, entry.filename, entry.archived);
    }),
  );
}

async function readRequirement(workflowRoot, reqId) {
  const requirements = await loadChanges(workflowPaths(workflowRoot));
  const requirement = requirements.find(
    (record) => !record.error && record.data.id === reqId,
  );
  if (!requirement)
    throw workflowError(
      "WF_REQUIREMENT_MISSING",
      "Requirement " + reqId + " does not exist.",
    );
  return requirement;
}

function pushSchemaErrors(diagnostics, record, validate, code) {
  if (validate(record.data)) return;
  for (const error of validate.errors) {
    const path = error.instancePath || "/";
    if (isDatePath(path) && error.keyword === "pattern") continue;
    diagnostics.push({
      code,
      path: record.path,
      message: path + ": " + error.message,
      severity: "error",
    });
  }
}

function pushDateDiagnostics(record, diagnostics) {
  const { created_at, updated_at, history } = record.data;
  if (typeof created_at === "string" && ISO_DATE.test(created_at) && !isDate(created_at)) {
    diagnostics.push({
      code: "WF_REQ_SCHEMA_INVALID",
      path: record.path,
      message: "created_at is not a valid calendar date.",
      severity: "error",
    });
  }
  if (typeof updated_at === "string" && ISO_DATE.test(updated_at) && !isDate(updated_at)) {
    diagnostics.push({
      code: "WF_UPDATED_AT_INVALID",
      path: record.path,
      message: "updated_at is not a valid calendar date.",
      severity: "error",
    });
  }
  if (Array.isArray(history)) {
    history.forEach((entry, index) => {
      if (entry && typeof entry.date === "string" && ISO_DATE.test(entry.date) && !isDate(entry.date)) {
        diagnostics.push({
          code: "WF_REQ_SCHEMA_INVALID",
          path: record.path,
          message: "/history/" + index + "/date is not a valid calendar date.",
          severity: "error",
        });
      }
    });
  }
}

function validatePlanRequirement(record, diagnostics) {
  const value = record.data;
  if (PLAN_REQUIRED_COMPLEXITIES.has(value.complexity) && value.plan_required !== true) {
    diagnostics.push({
      code: "WF_PLAN_REQUIRED_COMPLEXITY",
      path: record.path,
      message: "complexity " + value.complexity + " requires plan_required to be true.",
      severity: "error",
    });
  }
  if (
    Array.isArray(value.risk_tags) &&
    value.risk_tags.some((tag) => RISK_TAGS.has(tag)) &&
    value.plan_required !== true
  ) {
    diagnostics.push({
      code: "WF_PLAN_REQUIRED_RISK",
      path: record.path,
      message: "High-risk tags require plan_required to be true.",
      severity: "error",
    });
  }
}

function validateRequiredSections(record, diagnostics, sections, codePrefix) {
  for (const section of sections) {
    if (!section.pattern.test(record.content)) {
      diagnostics.push({
        code: codePrefix + "_SECTION_MISSING",
        path: record.path,
        message: "Missing required section: " + section.name + ".",
        severity: "error",
      });
    }
  }
}

function validateRequirementRecord(record, diagnostics) {
  pushSchemaErrors(diagnostics, record, validateRequirement, "WF_REQ_SCHEMA_INVALID");
  pushDateDiagnostics(record, diagnostics);
  validatePlanRequirement(record, diagnostics);
}

function validateHistory(record, diagnostics) {
  const { history, status, updated_at } = record.data;
  if (!Array.isArray(history) || history.length === 0) return;

  const first = history[0];
  if (!first || first.from !== null || first.to !== "draft") {
    diagnostics.push({
      code: "WF_HISTORY_STATUS_MISMATCH",
      path: record.path,
      message: "The first history entry must transition from null to draft.",
      severity: "error",
    });
  }

  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    if (!previous || !current || current.from !== previous.to) {
      diagnostics.push({
        code: "WF_HISTORY_STATUS_MISMATCH",
        path: record.path,
        message: "Each history entry must start at the previous entry status.",
        severity: "error",
      });
    }
    if (previous && current && !TRANSITIONS[previous.to]?.has(current.to)) {
      diagnostics.push({
        code: "WF_STATUS_TRANSITION_INVALID",
        path: record.path,
        message: "Invalid requirement transition: " + previous.to + " -> " + current.to + ".",
        severity: "error",
      });
    }
  }

  if (history.at(-1)?.to !== status) {
    diagnostics.push({
      code: "WF_HISTORY_STATUS_MISMATCH",
      path: record.path,
      message: "The final history status must equal the current status.",
      severity: "error",
    });
  }

  const dates = history.map((entry) => entry?.date).filter(isDate).sort();
  if (!isDate(updated_at) || (dates.length > 0 && updated_at < dates.at(-1))) {
    diagnostics.push({
      code: "WF_UPDATED_AT_INVALID",
      path: record.path,
      message: "updated_at must be a valid date on or after the latest history date.",
      severity: "error",
    });
  }
}

function validateLocation(record, diagnostics) {
  if (record.archived) {
    const match = record.filename.match(ARCHIVE_DIR);
    if (!match || match[2] !== record.data.id || !isDate(match[1])) {
      diagnostics.push({
        code: "WF_ARCHIVE_LOCATION_INVALID",
        path: record.path,
        message: "Archived change directory must be YYYY-MM-DD-REQ-xxxx-title and match proposal id.",
        severity: "error",
      });
    }
    if (record.data.status !== "archived") {
      diagnostics.push({
        code: "WF_ARCHIVE_LOCATION_INVALID",
        path: record.path,
        message: "Only archived requirements may live under docs/changes/archive.",
        severity: "error",
      });
    }
    return;
  }

  const match = record.filename.match(CHANGE_DIR);
  if (!match) {
    diagnostics.push({
      code: "WF_CHANGE_DIRECTORY_INVALID",
      path: record.path,
      message: "Active change directory must be REQ-xxxx-title.",
      severity: "error",
    });
  } else if (match[1] !== record.data.id) {
    diagnostics.push({
      code: "WF_FILENAME_ID_MISMATCH",
      path: record.path,
      message: "Change directory id " + match[1] + " must match proposal id " + record.data.id + ".",
      severity: "error",
    });
  }
  if (record.data.status === "archived") {
    diagnostics.push({
      code: "WF_ARCHIVE_LOCATION_INVALID",
      path: record.path,
      message: "Archived requirements must live under docs/changes/archive.",
      severity: "error",
    });
  }
}

async function validateArtifact(record, diagnostics, filename, missingCode, sections, sectionCode) {
  const path = join(record.changeDir, filename);
  if (!(await fileExists(path))) {
    diagnostics.push({
      code: missingCode,
      path,
      message: filename + " is required for " + record.data.id + " with status " + record.data.status + ".",
      severity: "error",
    });
    return;
  }
  validateRequiredSections(
    await loadMarkdownFile(path, basename(filename, ".md")),
    diagnostics,
    sections,
    sectionCode,
  );
}

async function validateArtifacts(record, diagnostics) {
  const status = record.data.status;
  if (["planned", "implemented", "verified", "archived"].includes(status)) {
    await validateArtifact(record, diagnostics, "design.md", "WF_DESIGN_MISSING", DESIGN_REQUIRED_SECTIONS, "WF_DESIGN");
    await validateArtifact(record, diagnostics, "tasks.md", "WF_TASKS_MISSING", TASKS_REQUIRED_SECTIONS, "WF_TASKS");
  }
  if (["implemented", "verified", "archived"].includes(status)) {
    await validateArtifact(record, diagnostics, "implementation.md", "WF_IMPLEMENTATION_MISSING", IMPLEMENTATION_REQUIRED_SECTIONS, "WF_IMPLEMENTATION");
  }
  if (["verified", "archived"].includes(status)) {
    await validateArtifact(record, diagnostics, "verification.md", "WF_VERIFICATION_MISSING", VERIFICATION_REQUIRED_SECTIONS, "WF_VERIFICATION");
  }
}

function replaceMarkerContents(source, name, content) {
  const start = "<!-- workflow:" + name + ":start -->";
  const end = "<!-- workflow:" + name + ":end -->";
  const expression = new RegExp(
    "(" + start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")[\\s\\S]*?(" +
      end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      ")",
  );
  if (!expression.test(source))
    throw new Error("Missing workflow marker pair: " + name + ".");
  return source.replace(expression, "$1\n" + content + "\n$2");
}

function markdown(value) {
  return String(value ?? "")
    .replaceAll("<!--", "&lt;!--")
    .replaceAll("-->", "--&gt;")
    .replaceAll("|", "\\|")
    .replace(/[\r\n]+/g, " ");
}

function table(headers, rows) {
  return [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map((row) => "| " + row.map(markdown).join(" | ") + " |"),
  ].join("\n");
}

function changeLink(record, file) {
  const prefix = record.archived ? "../docs/changes/archive/" : "../docs/changes/";
  const target = prefix + record.filename + "/" + file;
  return "[" + file.replace(".md", "") + "](" + target + ")";
}

async function specRows(paths) {
  const rows = [];
  for (const entry of await readDirectory(paths.specsRoot)) {
    if (!entry.isDirectory()) continue;
    const spec = join(paths.specsRoot, entry.name, "spec.md");
    if (await fileExists(spec)) {
      rows.push([entry.name, "[spec](../docs/specs/" + entry.name + "/spec.md)"]);
    }
  }
  return rows.sort((left, right) => left[0].localeCompare(right[0]));
}

export async function assertStatus(workflowRoot, reqId, allowedStatuses) {
  const requirement = await readRequirement(workflowRoot, reqId);
  if (!allowedStatuses.includes(requirement.data.status)) {
    throw workflowError(
      "WF_STATUS_NOT_ALLOWED",
      "Requirement " + reqId + " has status " + requirement.data.status + ", which is not allowed.",
    );
  }
  return requirement.data;
}

export async function syncIndex(workflowRoot) {
  const paths = workflowPaths(workflowRoot);
  const [changes, index] = await Promise.all([
    loadChanges(paths),
    readFile(join(workflowRoot, "index.md"), "utf8"),
  ]);

  const activeRows = await Promise.all(
    changes
      .filter((record) => !record.error && !record.archived)
      .sort((left, right) => left.data.id.localeCompare(right.data.id))
      .map(async (record) => [
        record.data.id,
        record.data.title,
        record.data.status,
        changeLink(record, "proposal.md"),
        (await fileExists(join(record.changeDir, "design.md"))) ? changeLink(record, "design.md") : "—",
        (await fileExists(join(record.changeDir, "tasks.md"))) ? changeLink(record, "tasks.md") : "—",
        (await fileExists(join(record.changeDir, "verification.md"))) ? changeLink(record, "verification.md") : "—",
      ]),
  );

  const withActiveWork = replaceMarkerContents(
    index,
    "active-work",
    table(["ID", "Title", "Status", "Change", "Design", "Tasks", "Verification"], activeRows),
  );

  await writeFile(
    join(workflowRoot, "index.md"),
    replaceMarkerContents(
      withActiveWork,
      "specs",
      table(["Domain", "Spec"], await specRows(paths)),
    ),
  );
}

export async function syncCurrent(workflowRoot, reqId) {
  let requirement;
  if (reqId) {
    requirement = await readRequirement(workflowRoot, reqId);
  } else {
    const requirements = (await loadChanges(workflowPaths(workflowRoot))).filter(
      (record) => !record.error && !record.archived && ACTIVE_STATUSES.has(record.data.status),
    );
    if (requirements.length > 1)
      throw workflowError("WF_CURRENT_AMBIGUOUS", "More than one active requirement exists.");
    requirement = requirements[0];
  }

  let content = "当前没有活动需求。";
  if (requirement) {
    const links = ["当前需求：[" + requirement.data.id + "](" + changeLink(requirement, "proposal.md").match(/\((.*?)\)/)[1] + ")"];
    if (await fileExists(join(requirement.changeDir, "design.md")))
      links.push("[Design](" + changeLink(requirement, "design.md").match(/\((.*?)\)/)[1] + ")");
    if (await fileExists(join(requirement.changeDir, "tasks.md")))
      links.push("[Tasks](" + changeLink(requirement, "tasks.md").match(/\((.*?)\)/)[1] + ")");
    content = links.join("\n\n");
  }

  const currentPath = join(workflowRoot, "current.md");
  await writeFile(
    currentPath,
    replaceMarkerContents(await readFile(currentPath, "utf8"), "current", content),
  );
}

export async function validateWorkflow(workflowRoot) {
  const diagnostics = [];
  const changes = await loadChanges(workflowPaths(workflowRoot));

  for (const record of changes) {
    if (record.error)
      diagnostics.push({
        code: "WF_FRONTMATTER_INVALID",
        path: record.path,
        message: record.error.message,
        severity: "error",
      });
  }

  for (const record of changes.filter((item) => !item.error)) {
    validateRequirementRecord(record, diagnostics);
    validateLocation(record, diagnostics);
    validateHistory(record, diagnostics);
    await validateArtifacts(record, diagnostics);
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    requirements: changes.filter((item) => !item.error).map(({ data }) => data),
  };
}
