import {
  access,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";

const REQUIREMENT_SCHEMA = JSON.parse(
  await readFile(
    new URL("../.workflow/schema/requirement.schema.json", import.meta.url),
    "utf8",
  ),
);
const CAPABILITY_SCHEMA = JSON.parse(
  await readFile(
    new URL("../.workflow/schema/capability.schema.json", import.meta.url),
    "utf8",
  ),
);

const ajv = new Ajv2020({ allErrors: true });
const validateRequirement = ajv.compile(REQUIREMENT_SCHEMA);
const validateCapability = ajv.compile(CAPABILITY_SCHEMA);

const REQUIREMENT_STATUSES = new Set([
  "draft",
  "accepted",
  "planned",
  "implemented",
  "verified",
  "archived",
  "blocked",
  "canceled",
  "reopened",
  "superseded",
]);
const CAPABILITY_STATUSES = new Set([
  "draft",
  "active",
  "deprecated",
  "superseded",
]);
const COMPLEXITIES = new Set(["simple", "medium", "complex"]);
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

const PLAN_REQUIRED_SECTIONS = [
  { name: "目标", pattern: /^##\s*(?:\d+\.\s*)?目标\s*$/m },
  { name: "非目标", pattern: /^##\s*(?:\d+\.\s*)?非目标\s*$/m },
  { name: "改动范围", pattern: /^##\s*(?:\d+\.\s*)?改动范围\s*$/m },
  { name: "方案设计", pattern: /^##\s*(?:\d+\.\s*)?方案设计\s*$/m },
  {
    name: "数据流 / 调用链路",
    pattern: /^##\s*(?:\d+\.\s*)?数据流\s*\/\s*调用链路\s*$/m,
  },
  {
    name: "接口 / 数据结构变化",
    pattern: /^##\s*(?:\d+\.\s*)?接口\s*\/\s*数据结构变化\s*$/m,
  },
  {
    name: "兼容性与迁移",
    pattern: /^##\s*(?:\d+\.\s*)?兼容性与迁移\s*$/m,
  },
  { name: "风险与回滚", pattern: /^##\s*(?:\d+\.\s*)?风险与回滚\s*$/m },
  { name: "测试策略", pattern: /^##\s*(?:\d+\.\s*)?测试策略\s*$/m },
  { name: "实施步骤", pattern: /^##\s*(?:\d+\.\s*)?实施步骤\s*$/m },
];

const IMPLEMENTATION_REQUIRED_SECTIONS = [
  {
    name: "实际改动范围",
    pattern: /^##\s*(?:\d+\.\s*)?实际改动范围\s*$/m,
  },
  {
    name: "与方案的偏差",
    pattern: /^##\s*(?:\d+\.\s*)?与方案的偏差\s*$/m,
  },
  { name: "测试记录", pattern: /^##\s*(?:\d+\.\s*)?测试记录\s*$/m },
  { name: "自审结果", pattern: /^##\s*(?:\d+\.\s*)?自审结果\s*$/m },
  { name: "残余风险", pattern: /^##\s*(?:\d+\.\s*)?残余风险\s*$/m },
  { name: "后续事项", pattern: /^##\s*(?:\d+\.\s*)?后续事项\s*$/m },
  {
    name: "Commit / PR",
    pattern: /^##\s*(?:\d+\.\s*)?Commit\s*\/\s*PR\s*$/m,
  },
  { name: "经验总结", pattern: /^##\s*(?:\d+\.\s*)?经验总结\s*$/m },
];

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

async function loadRecords(directory) {
  let files;
  try {
    files = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    files
      .filter((entry) => entry.isFile() && extname(entry.name) === ".md")
      .map(async (entry) => {
        const path = join(directory, entry.name);
        const source = await readFile(path, "utf8");
        try {
          return {
            path,
            filename: basename(entry.name, ".md"),
            data: parseFrontmatter(source),
          };
        } catch (error) {
          return { path, filename: basename(entry.name, ".md"), error };
        }
      }),
  );
}

async function loadMarkdownFiles(directory) {
  let files;
  try {
    files = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    files
      .filter((entry) => entry.isFile() && extname(entry.name) === ".md")
      .map(async (entry) => {
        const path = join(directory, entry.name);
        const content = await readFile(path, "utf8");
        return { path, filename: basename(entry.name, ".md"), content };
      }),
  );
}

async function readRequirement(workflowRoot, reqId) {
  const requirements = await loadRecords(join(workflowRoot, "requirements"));
  const requirement = requirements.find(
    (record) => !record.error && record.data.id === reqId,
  );
  if (!requirement)
    throw workflowError(
      "WF_REQUIREMENT_MISSING",
      `Requirement ${reqId} does not exist.`,
    );
  return requirement;
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

function pushSchemaErrors(diagnostics, record, validate, code) {
  if (validate(record.data)) return;
  for (const error of validate.errors) {
    const path = error.instancePath || "/";
    // Date format/validity is checked separately so we can emit the legacy diagnostic codes.
    if (isDatePath(path) && error.keyword === "pattern") continue;
    diagnostics.push({
      code,
      path: record.path,
      message: `${path}: ${error.message}`,
      severity: "error",
    });
  }
}

function pushDateDiagnostics(record, diagnostics) {
  const { created_at, updated_at, history } = record.data;
  if (
    typeof created_at === "string" &&
    ISO_DATE.test(created_at) &&
    !isDate(created_at)
  ) {
    diagnostics.push({
      code: "WF_REQ_SCHEMA_INVALID",
      path: record.path,
      message: "created_at is not a valid calendar date.",
      severity: "error",
    });
  }
  if (
    typeof updated_at === "string" &&
    ISO_DATE.test(updated_at) &&
    !isDate(updated_at)
  ) {
    diagnostics.push({
      code: "WF_UPDATED_AT_INVALID",
      path: record.path,
      message: "updated_at is not a valid calendar date.",
      severity: "error",
    });
  }
  if (Array.isArray(history)) {
    history.forEach((entry, index) => {
      if (
        entry &&
        typeof entry.date === "string" &&
        ISO_DATE.test(entry.date) &&
        !isDate(entry.date)
      ) {
        diagnostics.push({
          code: "WF_REQ_SCHEMA_INVALID",
          path: record.path,
          message: `/history/${index}/date is not a valid calendar date.`,
          severity: "error",
        });
      }
    });
  }
}

function validatePlanRequirement(record, diagnostics) {
  const value = record.data;
  if (
    PLAN_REQUIRED_COMPLEXITIES.has(value.complexity) &&
    value.plan_required !== true
  ) {
    diagnostics.push({
      code: "WF_PLAN_REQUIRED_COMPLEXITY",
      path: record.path,
      message: `complexity ${value.complexity} requires plan_required to be true.`,
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
        code: `${codePrefix}_SECTION_MISSING`,
        path: record.path,
        message: `Missing required section: ${section.name}.`,
        severity: "error",
      });
    }
  }
}

function validatePlanFile(record, diagnostics) {
  validateRequiredSections(
    record,
    diagnostics,
    PLAN_REQUIRED_SECTIONS,
    "WF_PLAN",
  );
}

function validateImplementationFile(record, diagnostics) {
  validateRequiredSections(
    record,
    diagnostics,
    IMPLEMENTATION_REQUIRED_SECTIONS,
    "WF_IMPLEMENTATION",
  );
}

function validateRequirementRecord(record, diagnostics) {
  pushSchemaErrors(
    diagnostics,
    record,
    validateRequirement,
    "WF_REQ_SCHEMA_INVALID",
  );
  pushDateDiagnostics(record, diagnostics);
  validatePlanRequirement(record, diagnostics);
}

function validateCapabilityRecord(record, diagnostics) {
  pushSchemaErrors(
    diagnostics,
    record,
    validateCapability,
    "WF_CAP_SCHEMA_INVALID",
  );
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
        message: `Invalid requirement transition: ${previous.to} -> ${current.to}.`,
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
      message:
        "updated_at must be a valid date on or after the latest history date.",
      severity: "error",
    });
  }
}

function replaceMarkerContents(source, name, content) {
  const start = `<!-- workflow:${name}:start -->`;
  const end = `<!-- workflow:${name}:end -->`;
  const expression = new RegExp(
    `(${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})[\\s\\S]*?(${end.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )})`,
  );
  if (!expression.test(source))
    throw new Error(`Missing workflow marker pair: ${name}.`);
  return source.replace(expression, `$1\n${content}\n$2`);
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
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdown).join(" | ")} |`),
  ].join("\n");
}

export async function assertStatus(workflowRoot, reqId, allowedStatuses) {
  const requirement = await readRequirement(workflowRoot, reqId);
  if (!allowedStatuses.includes(requirement.data.status)) {
    throw workflowError(
      "WF_STATUS_NOT_ALLOWED",
      `Requirement ${reqId} has status ${requirement.data.status}, which is not allowed.`,
    );
  }
  return requirement.data;
}

export async function syncIndex(workflowRoot) {
  const [requirements, capabilities, index] = await Promise.all([
    loadRecords(join(workflowRoot, "requirements")),
    loadRecords(join(workflowRoot, "capabilities")),
    readFile(join(workflowRoot, "index.md"), "utf8"),
  ]);

  const activeRows = await Promise.all(
    requirements
      .filter((record) => !record.error)
      .sort((left, right) => left.data.id.localeCompare(right.data.id))
      .map(async ({ data }) => [
        data.id,
        data.title,
        data.status,
        (await fileExists(join(workflowRoot, "plans", `${data.id}-plan.md`)))
          ? "yes"
          : "no",
        (await fileExists(
          join(workflowRoot, "implementations", `${data.id}-implementation.md`),
        ))
          ? "yes"
          : "no",
        data.capabilities.length > 0 ? data.capabilities.join(", ") : "—",
      ]),
  );

  const capabilityRows = capabilities
    .filter((record) => !record.error)
    .sort((left, right) => left.data.id.localeCompare(right.data.id))
    .map(({ data }) => [data.id, data.title, data.status, data.introduced_by]);

  const withActiveWork = replaceMarkerContents(
    index,
    "active-work",
    table(
      ["ID", "Title", "Status", "Plan", "Implementation", "Capabilities"],
      activeRows,
    ),
  );

  await writeFile(
    join(workflowRoot, "index.md"),
    replaceMarkerContents(
      withActiveWork,
      "capabilities",
      table(["ID", "Title", "Status", "Introduced By"], capabilityRows),
    ),
  );
}

const ACTIVE_STATUSES = new Set([
  "draft",
  "accepted",
  "planned",
  "implemented",
  "blocked",
  "reopened",
]);

export async function syncCurrent(workflowRoot, reqId) {
  let requirement;
  if (reqId) {
    requirement = await readRequirement(workflowRoot, reqId);
  } else {
    const requirements = (
      await loadRecords(join(workflowRoot, "requirements"))
    ).filter(
      (record) => !record.error && ACTIVE_STATUSES.has(record.data.status),
    );
    if (requirements.length > 1)
      throw workflowError(
        "WF_CURRENT_AMBIGUOUS",
        "More than one active requirement exists.",
      );
    requirement = requirements[0];
  }

  let content = "当前没有活动需求。";
  if (requirement) {
    const { id } = requirement.data;
    const links = [`当前需求：[${id}](requirements/${id}.md)`];
    if (await fileExists(join(workflowRoot, "plans", `${id}-plan.md`)))
      links.push(`[Plan](plans/${id}-plan.md)`);
    if (
      await fileExists(
        join(workflowRoot, "implementations", `${id}-implementation.md`),
      )
    )
      links.push(`[Implementation](implementations/${id}-implementation.md)`);
    content = links.join("\n\n");
  }

  const currentPath = join(workflowRoot, "current.md");
  await writeFile(
    currentPath,
    replaceMarkerContents(
      await readFile(currentPath, "utf8"),
      "current",
      content,
    ),
  );
}

export async function validateWorkflow(workflowRoot) {
  const diagnostics = [];
  const [requirements, capabilities, plans, implementations] =
    await Promise.all([
      loadRecords(join(workflowRoot, "requirements")),
      loadRecords(join(workflowRoot, "capabilities")),
      loadMarkdownFiles(join(workflowRoot, "plans")),
      loadMarkdownFiles(join(workflowRoot, "implementations")),
    ]);

  for (const record of [...requirements, ...capabilities]) {
    if (record.error)
      diagnostics.push({
        code: "WF_FRONTMATTER_INVALID",
        path: record.path,
        message: record.error.message,
        severity: "error",
      });
  }

  const plansByFilename = new Map(
    plans.map((record) => [record.filename, record]),
  );
  const implementationsByFilename = new Map(
    implementations.map((record) => [record.filename, record]),
  );

  for (const record of requirements.filter((item) => !item.error)) {
    validateRequirementRecord(record, diagnostics);

    if (record.filename !== record.data.id)
      diagnostics.push({
        code: "WF_FILENAME_ID_MISMATCH",
        path: record.path,
        message: `Filename ${record.filename} must match id ${record.data.id}.`,
        severity: "error",
      });

    validateHistory(record, diagnostics);

    const planFilename = `${record.data.id}-plan`;
    const planPath = join(workflowRoot, "plans", `${planFilename}.md`);
    if (record.data.plan_required === true) {
      if (!plansByFilename.has(planFilename)) {
        diagnostics.push({
          code: "WF_PLAN_MISSING",
          path: planPath,
          message: `Plan is required for ${record.data.id} but ${planFilename}.md does not exist.`,
          severity: "error",
        });
      } else {
        validatePlanFile(plansByFilename.get(planFilename), diagnostics);
      }
    }

    const implFilename = `${record.data.id}-implementation`;
    const implPath = join(
      workflowRoot,
      "implementations",
      `${implFilename}.md`,
    );
    if (["implemented", "verified", "archived"].includes(record.data.status)) {
      if (!implementationsByFilename.has(implFilename)) {
        diagnostics.push({
          code: "WF_IMPLEMENTATION_MISSING",
          path: implPath,
          message: `Implementation is required for ${record.data.id} with status ${record.data.status} but ${implFilename}.md does not exist.`,
          severity: "error",
        });
      } else {
        validateImplementationFile(
          implementationsByFilename.get(implFilename),
          diagnostics,
        );
      }
    }
  }

  for (const record of capabilities.filter((item) => !item.error)) {
    validateCapabilityRecord(record, diagnostics);
    if (record.filename !== record.data.id)
      diagnostics.push({
        code: "WF_FILENAME_ID_MISMATCH",
        path: record.path,
        message: `Filename ${record.filename} must match id ${record.data.id}.`,
        severity: "error",
      });
  }

  const capabilitiesById = new Map(
    capabilities
      .filter((item) => !item.error)
      .map((item) => [item.data.id, item.data]),
  );

  for (const requirement of requirements.filter(
    (item) => !item.error && Array.isArray(item.data.capabilities),
  )) {
    for (const capabilityId of requirement.data.capabilities) {
      const capability = capabilitiesById.get(capabilityId);
      if (!capability)
        diagnostics.push({
          code: "WF_CAPABILITY_MISSING",
          path: requirement.path,
          message: `Referenced capability ${capabilityId} does not exist.`,
          severity: "error",
        });
      else if (capability.status === "deprecated")
        diagnostics.push({
          code: "WF_CAPABILITY_DEPRECATED",
          path: requirement.path,
          message: `Referenced capability ${capabilityId} is deprecated.`,
          severity: "error",
        });
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    requirements: requirements
      .filter((item) => !item.error)
      .map(({ data }) => data),
    capabilities: capabilities
      .filter((item) => !item.error)
      .map(({ data }) => data),
  };
}
