import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  assertStatus,
  syncCurrent,
  syncIndex,
  validateWorkflow,
} from "../lib/validator.js";

const execFile = promisify(execFileCallback);
const CLI = join(process.cwd(), "bin", "workflow.js");

const proposal = (overrides = "") => `---
id: REQ-0001
title: Example requirement
status: accepted
complexity: simple
risk_tags: []
plan_required: false
plan_reason: No implementation plan needed
created_at: 2026-01-01
updated_at: 2026-01-02
references: []
specs: []
history:
  - date: 2026-01-01
    from: null
    to: draft
    note: Created
  - date: 2026-01-02
    from: draft
    to: accepted
    note: Accepted
${overrides}---
`;

function proposalWithStatus(status) {
  const base = proposal().replace("status: accepted", "status: " + status);
  const chains = {
    draft: [],
    accepted: [],
    planned: [
      "  - date: 2026-01-03\n    from: accepted\n    to: planned\n    note: Planned",
    ],
    implemented: [
      "  - date: 2026-01-03\n    from: accepted\n    to: planned\n    note: Planned",
      "  - date: 2026-01-04\n    from: planned\n    to: implemented\n    note: Implemented",
    ],
    verified: [
      "  - date: 2026-01-03\n    from: accepted\n    to: planned\n    note: Planned",
      "  - date: 2026-01-04\n    from: planned\n    to: implemented\n    note: Implemented",
      "  - date: 2026-01-05\n    from: implemented\n    to: verified\n    note: Verified",
    ],
    archived: [
      "  - date: 2026-01-03\n    from: accepted\n    to: planned\n    note: Planned",
      "  - date: 2026-01-04\n    from: planned\n    to: implemented\n    note: Implemented",
      "  - date: 2026-01-05\n    from: implemented\n    to: verified\n    note: Verified",
      "  - date: 2026-01-06\n    from: verified\n    to: archived\n    note: Archived",
    ],
    blocked: [],
    canceled: [],
    reopened: [],
    superseded: [],
  };
  const extra = chains[status] ?? [];
  const withUpdated = base.replace("updated_at: 2026-01-02", "updated_at: 2026-01-06");
  if (extra.length === 0) return withUpdated.replace("to: accepted", "to: " + status);
  return withUpdated.replace(
    "    from: draft\n    to: accepted\n    note: Accepted",
    "    from: draft\n    to: accepted\n    note: Accepted\n" + extra.join("\n"),
  );
}

const validDesign = `# REQ-0001 技术方案

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

const validTasks = `# 任务

## 任务

- [ ] 1. 完成实现
`;

const validImplementation = `# REQ-0001 实施记录

## 1. 实际改动范围
范围。

## 2. 与方案的偏差
- 无。

## 3. 测试记录
记录。

## 4. 自审结果
- 确认。

## 5. 残余风险
- 无。

## 6. 后续事项
- 无。

## 7. Commit / PR
- commit。

## 8. 经验总结
- 总结。
`;

const validVerification = `# 验证

## 验证记录
记录。

## 残余风险
- 无。
`;

async function fixture({
  req = proposal(),
  slug = "example",
  archived = false,
  archiveDate = "2026-01-06",
  artifacts = {},
  index = indexTemplate,
  current = currentTemplate,
} = {}) {
  const projectRoot = await mkdtemp(join(tmpdir(), "workflow-validator-"));
  const workflowRoot = join(projectRoot, ".workflow");
  await mkdir(workflowRoot, { recursive: true });
  await writeFile(join(workflowRoot, "index.md"), index);
  await writeFile(join(workflowRoot, "current.md"), current);
  const base = archived
    ? join(projectRoot, "docs", "changes", "archive", archiveDate + "-REQ-0001-" + slug)
    : join(projectRoot, "docs", "changes", "REQ-0001-" + slug);
  await mkdir(base, { recursive: true });
  await mkdir(join(projectRoot, "docs", "specs"), { recursive: true });
  await writeFile(join(base, "proposal.md"), req);
  for (const [name, content] of Object.entries(artifacts)) {
    await writeFile(join(base, name), content);
  }
  return { projectRoot, workflowRoot, changeDir: base };
}

const indexTemplate = `# Workflow Index

Static introduction.

## Active Work

<!-- workflow:active-work:start -->
old active content
<!-- workflow:active-work:end -->

Static middle text.

## Specs

<!-- workflow:specs:start -->
old specs
<!-- workflow:specs:end -->

Static footer.
`;

const currentTemplate = `# Current Workflow Context

## Current Requirement

<!-- workflow:current:start -->
old current content
<!-- workflow:current:end -->

## Required Reading Before Coding

Static reading instructions.
`;

const codes = (result) => result.diagnostics.map(({ code }) => code);
const validArtifacts = {
  "design.md": validDesign,
  "tasks.md": validTasks,
  "implementation.md": validImplementation,
  "verification.md": validVerification,
};

test("accepts a valid workflow", async () => {
  const { workflowRoot } = await fixture();
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
  assert.equal(result.requirements.length, 1);
});

test("accepts standard YAML features such as multiline strings, anchors, and nested objects", async () => {
  const req = proposal()
    .replace("title: Example requirement", "title: |\n  Multi\n  line title")
    .replace("created_at: 2026-01-01", "created_at: &date 2026-01-01")
    .replace("date: 2026-01-01", "date: *date")
    .replace("note: Created", "note: Created with \"quotes\"")
    .replace("references: []", "references: []\nmetadata:\n  nested:\n    key: value");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
});

test("rejects an illegal draft to planned transition", async () => {
  const req = proposal().replace("status: accepted", "status: planned").replace("to: accepted", "to: planned");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_STATUS_TRANSITION_INVALID"));
});

test("rejects a change directory that does not match frontmatter id", async () => {
  const { workflowRoot } = await fixture({ req: proposal().replaceAll("REQ-0001", "REQ-9999") });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_FILENAME_ID_MISMATCH"));
});

test("rejects malformed active change directory names", async () => {
  const { workflowRoot } = await fixture({ slug: "Bad_Title" });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_CHANGE_DIRECTORY_INVALID"));
});

test("rejects history whose final status differs from current status", async () => {
  const { workflowRoot } = await fixture({ req: proposal().replace("status: accepted", "status: planned") });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_HISTORY_STATUS_MISMATCH"));
});

test("rejects invalid optional requirement field types", async () => {
  const req = proposal().replace(
    "plan_reason: No implementation plan needed",
    "plan_reason: No implementation plan needed\nowner:\n  - not-a-scalar\nreviewers: reviewer\napprovers:\n  - 42",
  );
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects numeric reviewer and approver items", async () => {
  const req = proposal().replace(
    "plan_reason: No implementation plan needed",
    "plan_reason: No implementation plan needed\nreviewers: [42]\napprovers:\n  - 7",
  );
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects extra keys in a history entry", async () => {
  const req = proposal().replace("    note: Created", "    note: Created\n    unexpected: value");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects bare collection keys instead of treating them as empty arrays", async () => {
  const req = proposal()
    .replace("risk_tags: []", "risk_tags:")
    .replace("references: []", "references:")
    .replace("specs: []", "specs:");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects duplicate top-level and history mapping keys", async () => {
  const duplicateTopLevel = proposal().replace("title: Example requirement", "title: Example requirement\ntitle: Repeated title");
  const { workflowRoot: topRoot } = await fixture({ req: duplicateTopLevel });
  const topLevel = await validateWorkflow(topRoot);
  assert.ok(codes(topLevel).includes("WF_FRONTMATTER_INVALID"));

  const duplicateHistoryKey = proposal().replace("    note: Created", "    note: Created\n    note: Repeated note");
  const { workflowRoot: historyRoot } = await fixture({ req: duplicateHistoryKey });
  const history = await validateWorkflow(historyRoot);
  assert.ok(codes(history).includes("WF_FRONTMATTER_INVALID"));
});

test("rejects impossible ISO calendar dates", async () => {
  const { workflowRoot: invalidCreatedRoot } = await fixture({
    req: proposal().replace("created_at: 2026-01-01", "created_at: 2026-02-31"),
  });
  const invalidCreated = await validateWorkflow(invalidCreatedRoot);
  assert.ok(codes(invalidCreated).includes("WF_REQ_SCHEMA_INVALID"));

  const { workflowRoot: invalidUpdatedRoot } = await fixture({
    req: proposal().replace("updated_at: 2026-01-02", "updated_at: 2026-13-01"),
  });
  const invalidUpdated = await validateWorkflow(invalidUpdatedRoot);
  assert.ok(codes(invalidUpdated).includes("WF_UPDATED_AT_INVALID"));
});

test("accepts valid ISO dates in years below 0100", async () => {
  const req = proposal()
    .replace("created_at: 2026-01-01", "created_at: 0099-12-31")
    .replaceAll("2026-01-02", "0099-12-31")
    .replaceAll("2026-01-01", "0099-12-31");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
});

test("assertStatus returns an allowed requirement and rejects missing or disallowed statuses", async () => {
  const { workflowRoot } = await fixture();
  const record = await assertStatus(workflowRoot, "REQ-0001", ["accepted", "planned"]);
  assert.equal(record.id, "REQ-0001");

  await assert.rejects(assertStatus(workflowRoot, "REQ-0001", ["planned"]), (error) => error.code === "WF_STATUS_NOT_ALLOWED");
  await assert.rejects(assertStatus(workflowRoot, "REQ-9999", ["accepted"]), (error) => error.code === "WF_REQUIREMENT_MISSING");
});

for (const complexity of ["medium", "complex"]) {
  test("rejects " + complexity + " complexity without plan_required true", async () => {
    const req = proposal().replace("complexity: simple", "complexity: " + complexity);
    const { workflowRoot } = await fixture({ req });
    const result = await validateWorkflow(workflowRoot);
    assert.ok(codes(result).includes("WF_PLAN_REQUIRED_COMPLEXITY"));
  });
}

test("rejects high-risk tags without plan_required true", async () => {
  const req = proposal().replace("risk_tags: []", "risk_tags:\n  - security");
  const { workflowRoot } = await fixture({ req });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_PLAN_REQUIRED_RISK"));
});

test("rejects missing design and tasks for planned status", async () => {
  const { workflowRoot } = await fixture({ req: proposalWithStatus("planned") });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_DESIGN_MISSING"));
  assert.ok(codes(result).includes("WF_TASKS_MISSING"));
});

test("rejects design and tasks files missing required sections", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("planned"),
    artifacts: { "design.md": "# Design\n\n## 1. 目标\nOnly goal.\n", "tasks.md": "# Tasks\n" },
  });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_DESIGN_SECTION_MISSING"));
  assert.ok(codes(result).includes("WF_TASKS_SECTION_MISSING"));
});

test("accepts valid design and tasks for planned status", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("planned"),
    artifacts: { "design.md": validDesign, "tasks.md": validTasks },
  });
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
});

for (const status of ["implemented", "verified", "archived"]) {
  test("rejects missing implementation file for " + status + " status", async () => {
    const { workflowRoot } = await fixture({
      req: proposalWithStatus(status),
      artifacts: { "design.md": validDesign, "tasks.md": validTasks, ...(status === "verified" ? { "verification.md": validVerification } : {}) },
      archived: status === "archived",
    });
    const result = await validateWorkflow(workflowRoot);
    assert.ok(codes(result).includes("WF_IMPLEMENTATION_MISSING"));
  });
}

test("rejects implementation file missing required sections", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("implemented"),
    artifacts: { "design.md": validDesign, "tasks.md": validTasks, "implementation.md": "# Impl\n\n## 1. 实际改动范围\n范围。\n" },
  });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_IMPLEMENTATION_SECTION_MISSING"));
});

test("rejects missing verification file for verified status", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("verified"),
    artifacts: { "design.md": validDesign, "tasks.md": validTasks, "implementation.md": validImplementation },
  });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_VERIFICATION_MISSING"));
});

test("rejects verification file missing required sections", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("verified"),
    artifacts: { "design.md": validDesign, "tasks.md": validTasks, "implementation.md": validImplementation, "verification.md": "# Verification\n\n## 验证记录\n记录。\n" },
  });
  const result = await validateWorkflow(workflowRoot);
  assert.ok(codes(result).includes("WF_VERIFICATION_SECTION_MISSING"));
});

test("accepts a valid verified workflow", async () => {
  const { workflowRoot } = await fixture({
    req: proposalWithStatus("verified"),
    artifacts: validArtifacts,
  });
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
});

test("rejects archived status outside archive and non-archived status inside archive", async () => {
  const activeArchived = await fixture({ req: proposalWithStatus("archived"), artifacts: validArtifacts });
  const activeResult = await validateWorkflow(activeArchived.workflowRoot);
  assert.ok(codes(activeResult).includes("WF_ARCHIVE_LOCATION_INVALID"));

  const archivedAccepted = await fixture({ req: proposal(), archived: true });
  const archivedResult = await validateWorkflow(archivedAccepted.workflowRoot);
  assert.ok(codes(archivedResult).includes("WF_ARCHIVE_LOCATION_INVALID"));
});

test("accepts archived workflow in archive directory", async () => {
  const { workflowRoot } = await fixture({ req: proposalWithStatus("archived"), artifacts: validArtifacts, archived: true });
  const result = await validateWorkflow(workflowRoot);
  assert.equal(result.valid, true);
});

test("syncIndex renders sorted change and specs tables while preserving static text idempotently", async () => {
  const { projectRoot, workflowRoot } = await fixture({ artifacts: { "design.md": validDesign, "tasks.md": validTasks } });
  const secondDir = join(projectRoot, "docs", "changes", "REQ-0002-second");
  await mkdir(secondDir, { recursive: true });
  await writeFile(join(secondDir, "proposal.md"), proposal().replaceAll("REQ-0001", "REQ-0002").replace("Example requirement", "Second requirement"));
  await mkdir(join(projectRoot, "docs", "specs", "ui"), { recursive: true });
  await writeFile(join(projectRoot, "docs", "specs", "ui", "spec.md"), "# UI Spec\n");

  await syncIndex(workflowRoot);
  const once = await readFile(join(workflowRoot, "index.md"), "utf8");
  await syncIndex(workflowRoot);
  const twice = await readFile(join(workflowRoot, "index.md"), "utf8");

  assert.equal(once, twice);
  assert.match(once, /Static introduction\.|Static middle text\.|Static footer\./);
  assert.match(once, /\| REQ-0001 \| Example requirement \| accepted \| \[proposal\]\(\.\.\/docs\/changes\/REQ-0001-example\/proposal\.md\)/);
  assert.match(once, /\| REQ-0002 \| Second requirement \| accepted \| \[proposal\]\(\.\.\/docs\/changes\/REQ-0002-second\/proposal\.md\)/);
  assert.match(once, /\| ui \| \[spec\]\(\.\.\/docs\/specs\/ui\/spec\.md\) \|/);
});

test("syncIndex escapes marker syntax in generated table cells", async () => {
  const { workflowRoot } = await fixture({
    req: proposal().replace("Example requirement", "evil <!-- workflow:active-work:end --> title"),
  });

  await syncIndex(workflowRoot);
  const once = await readFile(join(workflowRoot, "index.md"), "utf8");
  await syncIndex(workflowRoot);
  const twice = await readFile(join(workflowRoot, "index.md"), "utf8");

  assert.equal(once, twice);
  assert.equal((once.match(/<!-- workflow:active-work:start -->/g) ?? []).length, 1);
  assert.equal((once.match(/<!-- workflow:active-work:end -->/g) ?? []).length, 1);
  assert.match(once, /evil &lt;!-- workflow:active-work:end --&gt; title/);
});

test("syncCurrent writes explicit and automatically selected context, no-active context, and rejects ambiguity", async () => {
  const { projectRoot, workflowRoot } = await fixture({ artifacts: { "design.md": validDesign, "tasks.md": validTasks } });
  await syncCurrent(workflowRoot, "REQ-0001");
  let current = await readFile(join(workflowRoot, "current.md"), "utf8");
  assert.match(current, /\[REQ-0001\]\(\.\.\/docs\/changes\/REQ-0001-example\/proposal\.md\)/);
  assert.match(current, /\[Design\]\(\.\.\/docs\/changes\/REQ-0001-example\/design\.md\)/);
  assert.match(current, /\[Tasks\]\(\.\.\/docs\/changes\/REQ-0001-example\/tasks\.md\)/);
  assert.match(current, /Static reading instructions\./);

  await syncCurrent(workflowRoot);
  current = await readFile(join(workflowRoot, "current.md"), "utf8");
  assert.match(current, /REQ-0001/);

  const inactive = await fixture({ req: proposalWithStatus("verified"), artifacts: validArtifacts });
  await syncCurrent(inactive.workflowRoot);
  assert.match(await readFile(join(inactive.workflowRoot, "current.md"), "utf8"), /当前没有活动需求。/);

  const secondDir = join(projectRoot, "docs", "changes", "REQ-0002-another");
  await mkdir(secondDir, { recursive: true });
  await writeFile(join(secondDir, "proposal.md"), proposal().replaceAll("REQ-0001", "REQ-0002").replace("Example requirement", "Another requirement"));
  await assert.rejects(syncCurrent(workflowRoot), (error) => error.code === "WF_CURRENT_AMBIGUOUS");
});

for (const status of ["draft", "planned", "implemented", "blocked", "reopened"]) {
  test("syncCurrent automatically selects a " + status + " requirement", async () => {
    const artifacts = ["planned", "implemented"].includes(status) ? { "design.md": validDesign, "tasks.md": validTasks, ...(status === "implemented" ? { "implementation.md": validImplementation } : {}) } : {};
    const { workflowRoot } = await fixture({ req: proposalWithStatus(status), artifacts });

    await syncCurrent(workflowRoot);

    assert.match(await readFile(join(workflowRoot, "current.md"), "utf8"), /\[REQ-0001\]\(\.\.\/docs\/changes\/REQ-0001-example\/proposal\.md\)/);
  });
}

async function runCli(args, cwd) {
  const { stdout, stderr } = await execFile(process.execPath, [CLI, ...args.split(" ")], { cwd });
  return { stdout, stderr, exitCode: 0 };
}

async function runCliExpectFailure(args, cwd) {
  try {
    await execFile(process.execPath, [CLI, ...args.split(" ")], { cwd });
    return { stdout: "", stderr: "", exitCode: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", exitCode: error.code ?? 1 };
  }
}

test("CLI --assert-status passes when status is allowed", async () => {
  const { projectRoot } = await fixture();
  const { stdout, exitCode } = await runCli("--assert-status REQ-0001 --status accepted --status planned", projectRoot);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Requirement REQ-0001 status is allowed/);
});

test("CLI --assert-status fails when status is not allowed", async () => {
  const { projectRoot } = await fixture();
  const { stderr, exitCode } = await runCliExpectFailure("--assert-status REQ-0001 --status planned", projectRoot);
  assert.equal(exitCode, 1);
  assert.match(stderr, /which is not allowed/);
});

test("CLI --assert-status fails when requirement is missing", async () => {
  const { projectRoot } = await fixture();
  const { stderr, exitCode } = await runCliExpectFailure("--assert-status REQ-9999 --status accepted", projectRoot);
  assert.equal(exitCode, 1);
  assert.match(stderr, /does not exist/);
});

test("CLI --assert-status requires at least one --status", async () => {
  const { projectRoot } = await fixture();
  const { stderr, exitCode } = await runCliExpectFailure("--assert-status REQ-0001", projectRoot);
  assert.equal(exitCode, 1);
  assert.match(stderr, /requires at least one --status/);
});

const SKILL_CONTRACTS = [
  { name: "workflow-new", asserts: false },
  { name: "workflow-confirm", asserts: true },
  { name: "workflow-plan", asserts: true },
  { name: "workflow-exec", asserts: true },
  { name: "workflow-check", asserts: true },
  { name: "workflow-archive", asserts: true },
];

for (const { name, asserts } of SKILL_CONTRACTS) {
  test("Skill " + name + " includes execution contract with --validate" + (asserts ? " and --assert-status" : ""), async () => {
    const path = new URL("../skills/" + name + "/SKILL.md", import.meta.url);
    const content = await readFile(path, "utf8");
    assert.match(content, /--validate/);
    assert.match(content, /Execution contract/);
    assert.match(content, /MUST enforce this contract/);
    if (asserts) {
      assert.match(content, /--assert-status/);
    }
  });
}
