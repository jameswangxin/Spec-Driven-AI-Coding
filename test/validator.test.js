import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertStatus,
  syncCurrent,
  syncIndex,
  validateWorkflow,
} from "../lib/validator.js";

const requirement = (overrides = "") => `---
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
capabilities:
  - CAP-0001
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

function requirementWithStatus(status) {
  const base = requirement()
    .replace("status: accepted", `status: ${status}`)
    .replace("updated_at: 2026-01-02", "updated_at: 2026-01-06");
  const transitions = {
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
  const extra = transitions[status] ?? [];
  if (extra.length === 0) return base.replace("to: accepted", `to: ${status}`);
  return base.replace(
    "    from: draft\n    to: accepted\n    note: Accepted",
    `    from: draft\n    to: accepted\n    note: Accepted\n${extra.join("\n")}`,
  );
}

const capability = (overrides = "") => `---
id: CAP-0001
title: Example capability
status: active
introduced_by: REQ-0001
updated_by:
  - REQ-0001
${overrides}---
`;

async function fixture({
  reqName = "REQ-0001.md",
  req = requirement(),
  caps = { "CAP-0001.md": capability() },
  plans = {},
  implementations = {},
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "workflow-validator-"));
  await mkdir(join(root, "requirements"));
  await mkdir(join(root, "capabilities"));
  await writeFile(join(root, "requirements", reqName), req);
  await Promise.all(
    Object.entries(caps).map(([name, content]) =>
      writeFile(join(root, "capabilities", name), content),
    ),
  );
  if (Object.keys(plans).length > 0) await mkdir(join(root, "plans"));
  await Promise.all(
    Object.entries(plans).map(([name, content]) =>
      writeFile(join(root, "plans", name), content),
    ),
  );
  if (Object.keys(implementations).length > 0)
    await mkdir(join(root, "implementations"));
  await Promise.all(
    Object.entries(implementations).map(([name, content]) =>
      writeFile(join(root, "implementations", name), content),
    ),
  );
  return root;
}

const indexTemplate = `# Workflow Index

Static introduction.

## Active Work

<!-- workflow:active-work:start -->
old active content
<!-- workflow:active-work:end -->

Static middle text.

## Capability Specs

<!-- workflow:capabilities:start -->
old capabilities
<!-- workflow:capabilities:end -->

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

async function syncFixture(options = {}) {
  const root = await fixture(options);
  await mkdir(join(root, "plans"));
  await mkdir(join(root, "implementations"));
  await writeFile(join(root, "index.md"), indexTemplate);
  await writeFile(join(root, "current.md"), currentTemplate);
  return root;
}

const codes = (result) => result.diagnostics.map(({ code }) => code);

test("accepts a valid workflow", async () => {
  const result = await validateWorkflow(await fixture());
  assert.equal(result.valid, true);
  assert.equal(result.requirements.length, 1);
  assert.equal(result.capabilities.length, 1);
});

test("accepts standard YAML features such as multiline strings, anchors, and nested objects", async () => {
  const req = requirement()
    .replace("title: Example requirement", "title: |\n  Multi\n  line title")
    .replace("created_at: 2026-01-01", "created_at: &date 2026-01-01")
    .replace("date: 2026-01-01", "date: *date")
    .replace("note: Created", 'note: Created with "quotes"')
    .replace("references: []", "references: []\nmetadata:\n  nested:\n    key: value");
  const result = await validateWorkflow(await fixture({ req }));
  assert.equal(result.valid, true);
});

test("rejects an illegal draft to planned transition", async () => {
  const req = requirement()
    .replace("status: accepted", "status: planned")
    .replace("to: accepted", "to: planned");
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_STATUS_TRANSITION_INVALID"));
});

test("rejects missing and deprecated capabilities", async () => {
  const missing = await validateWorkflow(await fixture({ caps: {} }));
  assert.ok(codes(missing).includes("WF_CAPABILITY_MISSING"));

  const deprecated = await validateWorkflow(
    await fixture({
      caps: {
        "CAP-0001.md": capability().replace(
          "status: active",
          "status: deprecated",
        ),
      },
    }),
  );
  assert.ok(codes(deprecated).includes("WF_CAPABILITY_DEPRECATED"));
});

test("rejects a filename that does not match frontmatter id", async () => {
  const result = await validateWorkflow(
    await fixture({ reqName: "REQ-9999.md" }),
  );
  assert.ok(codes(result).includes("WF_FILENAME_ID_MISMATCH"));
});

test("rejects history whose final status differs from current status", async () => {
  const result = await validateWorkflow(
    await fixture({
      req: requirement().replace("status: accepted", "status: planned"),
    }),
  );
  assert.ok(codes(result).includes("WF_HISTORY_STATUS_MISMATCH"));
});

test("rejects invalid optional requirement field types", async () => {
  const req = requirement().replace(
    "plan_reason: No implementation plan needed",
    "plan_reason: No implementation plan needed\nowner:\n  - not-a-scalar\nreviewers: reviewer\napprovers:\n  - 42",
  );
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects numeric reviewer and approver items", async () => {
  const req = requirement().replace(
    "plan_reason: No implementation plan needed",
    "plan_reason: No implementation plan needed\nreviewers: [42]\napprovers:\n  - 7",
  );
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects extra keys in a history entry", async () => {
  const req = requirement().replace(
    "    note: Created",
    "    note: Created\n    unexpected: value",
  );
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
});

test("rejects bare collection keys instead of treating them as empty arrays", async () => {
  const req = requirement()
    .replace("risk_tags: []", "risk_tags:")
    .replace("references: []", "references:")
    .replace("capabilities:\n  - CAP-0001", "capabilities:");
  const cap = capability().replace("updated_by:\n  - REQ-0001", "updated_by:");
  const result = await validateWorkflow(
    await fixture({ req, caps: { "CAP-0001.md": cap } }),
  );
  assert.ok(codes(result).includes("WF_REQ_SCHEMA_INVALID"));
  assert.ok(codes(result).includes("WF_CAP_SCHEMA_INVALID"));
});

test("rejects duplicate top-level and history mapping keys", async () => {
  const duplicateTopLevel = requirement().replace(
    "title: Example requirement",
    "title: Example requirement\ntitle: Repeated title",
  );
  const topLevel = await validateWorkflow(
    await fixture({ req: duplicateTopLevel }),
  );
  assert.ok(codes(topLevel).includes("WF_FRONTMATTER_INVALID"));

  const duplicateHistoryKey = requirement().replace(
    "    note: Created",
    "    note: Created\n    note: Repeated note",
  );
  const history = await validateWorkflow(
    await fixture({ req: duplicateHistoryKey }),
  );
  assert.ok(codes(history).includes("WF_FRONTMATTER_INVALID"));
});

test("rejects impossible ISO calendar dates", async () => {
  const invalidCreated = await validateWorkflow(
    await fixture({
      req: requirement().replace(
        "created_at: 2026-01-01",
        "created_at: 2026-02-31",
      ),
    }),
  );
  assert.ok(codes(invalidCreated).includes("WF_REQ_SCHEMA_INVALID"));

  const invalidUpdated = await validateWorkflow(
    await fixture({
      req: requirement().replace(
        "updated_at: 2026-01-02",
        "updated_at: 2026-13-01",
      ),
    }),
  );
  assert.ok(codes(invalidUpdated).includes("WF_UPDATED_AT_INVALID"));
});

test("accepts valid ISO dates in years below 0100", async () => {
  const req = requirement()
    .replace("created_at: 2026-01-01", "created_at: 0099-12-31")
    .replaceAll("2026-01-02", "0099-12-31")
    .replaceAll("2026-01-01", "0099-12-31");
  const result = await validateWorkflow(await fixture({ req }));
  assert.equal(result.valid, true);
});

test("assertStatus returns an allowed requirement and rejects missing or disallowed statuses", async () => {
  const root = await fixture();
  const record = await assertStatus(root, "REQ-0001", ["accepted", "planned"]);
  assert.equal(record.id, "REQ-0001");

  await assert.rejects(
    assertStatus(root, "REQ-0001", ["planned"]),
    (error) => error.code === "WF_STATUS_NOT_ALLOWED",
  );
  await assert.rejects(
    assertStatus(root, "REQ-9999", ["accepted"]),
    (error) => error.code === "WF_REQUIREMENT_MISSING",
  );
});

const validPlan = `# REQ-0001 技术方案

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

for (const complexity of ["medium", "complex"]) {
  test(`rejects ${complexity} complexity without plan_required true`, async () => {
    const req = requirement()
      .replace("complexity: simple", `complexity: ${complexity}`)
      .replace("plan_required: false", "plan_required: false");
    const result = await validateWorkflow(await fixture({ req }));
    assert.ok(codes(result).includes("WF_PLAN_REQUIRED_COMPLEXITY"));
  });
}

test("rejects high-risk tags without plan_required true", async () => {
  const req = requirement()
    .replace("risk_tags: []", "risk_tags:\n  - security")
    .replace("plan_required: false", "plan_required: false");
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_PLAN_REQUIRED_RISK"));
});

test("rejects simple complexity with high-risk tags without plan_required true", async () => {
  const req = requirement()
    .replace("risk_tags: []", "risk_tags:\n  - data")
    .replace("plan_required: false", "plan_required: false");
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_PLAN_REQUIRED_RISK"));
});

test("rejects missing plan file when plan_required is true", async () => {
  const req = requirement()
    .replace("plan_required: false", "plan_required: true")
    .replace(
      "plan_reason: No implementation plan needed",
      "plan_reason: Plan required",
    );
  const result = await validateWorkflow(await fixture({ req }));
  assert.ok(codes(result).includes("WF_PLAN_MISSING"));
});

test("rejects plan file missing required sections", async () => {
  const req = requirement()
    .replace("plan_required: false", "plan_required: true")
    .replace(
      "plan_reason: No implementation plan needed",
      "plan_reason: Plan required",
    );
  const result = await validateWorkflow(
    await fixture({
      req,
      plans: {
        "REQ-0001-plan.md": "# REQ-0001 技术方案\n\n## 1. 目标\n\n仅目标。\n",
      },
    }),
  );
  assert.ok(codes(result).includes("WF_PLAN_SECTION_MISSING"));
});

test("accepts a valid plan file when plan_required is true", async () => {
  const req = requirement()
    .replace("plan_required: false", "plan_required: true")
    .replace(
      "plan_reason: No implementation plan needed",
      "plan_reason: Plan required",
    );
  const result = await validateWorkflow(
    await fixture({ req, plans: { "REQ-0001-plan.md": validPlan } }),
  );
  assert.equal(result.valid, true);
});

for (const status of ["implemented", "verified", "archived"]) {
  test(`rejects missing implementation file for ${status} status`, async () => {
    const result = await validateWorkflow(
      await fixture({ req: requirementWithStatus(status) }),
    );
    assert.ok(codes(result).includes("WF_IMPLEMENTATION_MISSING"));
  });
}

test("rejects implementation file missing required sections", async () => {
  const result = await validateWorkflow(
    await fixture({
      req: requirementWithStatus("implemented"),
      implementations: {
        "REQ-0001-implementation.md":
          "# REQ-0001 实施记录\n\n## 1. 实际改动范围\n\n范围。\n",
      },
    }),
  );
  assert.ok(codes(result).includes("WF_IMPLEMENTATION_SECTION_MISSING"));
});

for (const status of ["implemented", "verified", "archived"]) {
  test(`accepts a valid implementation file for ${status} status`, async () => {
    const result = await validateWorkflow(
      await fixture({
        req: requirementWithStatus(status),
        implementations: {
          "REQ-0001-implementation.md": validImplementation,
        },
      }),
    );
    assert.equal(result.valid, true);
  });
}

test("syncIndex renders sorted requirement and capability tables while preserving static text idempotently", async () => {
  const req2 = requirement()
    .replaceAll("REQ-0001", "REQ-0002")
    .replaceAll("CAP-0001", "CAP-0002")
    .replace("Example requirement", "Second requirement")
    .replace("status: accepted", "status: planned")
    .replace("to: accepted", "to: planned")
    .replace("from: draft", "from: accepted")
    .replace("date: 2026-01-02", "date: 2026-01-03")
    .replace("updated_at: 2026-01-02", "updated_at: 2026-01-03")
    .replace(
      "    from: draft\n    to: planned",
      "    from: draft\n    to: accepted\n    note: Accepted\n  - date: 2026-01-03\n    from: accepted\n    to: planned",
    );
  const cap2 = capability()
    .replaceAll("CAP-0001", "CAP-0002")
    .replace("Example capability", "Second capability")
    .replaceAll("REQ-0001", "REQ-0002");
  const root = await syncFixture({
    caps: { "CAP-0002.md": cap2, "CAP-0001.md": capability() },
  });
  await writeFile(join(root, "requirements", "REQ-0002.md"), req2);
  await writeFile(join(root, "plans", "REQ-0001-plan.md"), "plan");
  await writeFile(
    join(root, "implementations", "REQ-0002-implementation.md"),
    "implementation",
  );

  await syncIndex(root);
  const once = await readFile(join(root, "index.md"), "utf8");
  await syncIndex(root);
  const twice = await readFile(join(root, "index.md"), "utf8");

  assert.equal(once, twice);
  assert.match(
    once,
    /Static introduction\.|Static middle text\.|Static footer\./,
  );
  assert.match(
    once,
    /\| REQ-0001 \| Example requirement \| accepted \| yes \| no \| CAP-0001 \|/,
  );
  assert.match(
    once,
    /\| REQ-0002 \| Second requirement \| planned \| no \| yes \| CAP-0002 \|/,
  );
  assert.match(
    once,
    /\| CAP-0001 \| Example capability \| active \| REQ-0001 \|/,
  );
  assert.match(
    once,
    /\| CAP-0002 \| Second capability \| active \| REQ-0002 \|/,
  );
  assert.ok(once.indexOf("REQ-0001") < once.indexOf("REQ-0002"));
  assert.ok(once.indexOf("CAP-0001") < once.indexOf("CAP-0002"));
});

test("syncIndex escapes marker syntax in generated table cells", async () => {
  const root = await syncFixture({
    req: requirement().replace(
      "Example requirement",
      "evil <!-- workflow:active-work:end --> title",
    ),
  });

  await syncIndex(root);
  const once = await readFile(join(root, "index.md"), "utf8");
  await syncIndex(root);
  const twice = await readFile(join(root, "index.md"), "utf8");

  assert.equal(once, twice);
  assert.equal(
    (once.match(/<!-- workflow:active-work:start -->/g) ?? []).length,
    1,
  );
  assert.equal(
    (once.match(/<!-- workflow:active-work:end -->/g) ?? []).length,
    1,
  );
  assert.match(once, /evil &lt;!-- workflow:active-work:end --&gt; title/);
});

test("syncCurrent writes explicit and automatically selected context, no-active context, and rejects ambiguity", async () => {
  const root = await syncFixture();
  await writeFile(join(root, "plans", "REQ-0001-plan.md"), "plan");
  await syncCurrent(root, "REQ-0001");
  let current = await readFile(join(root, "current.md"), "utf8");
  assert.match(current, /\[REQ-0001\]\(requirements\/REQ-0001\.md\)/);
  assert.match(current, /\[Plan\]\(plans\/REQ-0001-plan\.md\)/);
  assert.match(current, /Static reading instructions\./);

  await syncCurrent(root);
  current = await readFile(join(root, "current.md"), "utf8");
  assert.match(current, /REQ-0001/);

  const inactive = await syncFixture({
    req: requirement()
      .replace("status: accepted", "status: verified")
      .replace("to: accepted", "to: verified"),
  });
  await syncCurrent(inactive);
  assert.match(
    await readFile(join(inactive, "current.md"), "utf8"),
    /当前没有活动需求。/,
  );

  const ambiguous = await syncFixture();
  await writeFile(
    join(ambiguous, "requirements", "REQ-0002.md"),
    requirement()
      .replaceAll("REQ-0001", "REQ-0002")
      .replace("Example requirement", "Another requirement"),
  );
  await assert.rejects(
    syncCurrent(ambiguous),
    (error) => error.code === "WF_CURRENT_AMBIGUOUS",
  );
});

for (const status of [
  "draft",
  "planned",
  "implemented",
  "blocked",
  "reopened",
]) {
  test(`syncCurrent automatically selects a ${status} requirement`, async () => {
    const root = await syncFixture({
      req: requirement()
        .replace("status: accepted", `status: ${status}`)
        .replace("to: accepted", `to: ${status}`),
    });

    await syncCurrent(root);

    assert.match(
      await readFile(join(root, "current.md"), "utf8"),
      /\[REQ-0001\]\(requirements\/REQ-0001\.md\)/,
    );
  });
}


import { cp } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function projectFixture(options = {}) {
  const workflowRoot = await fixture(options);
  const projectRoot = await mkdtemp(join(tmpdir(), "workflow-project-"));
  await cp(workflowRoot, join(projectRoot, ".workflow"), { recursive: true });
  return projectRoot;
}

async function runCli(args, cwd = process.cwd()) {
  const { stdout, stderr } = await execAsync(`node ${new URL("../bin/workflow.js", import.meta.url).pathname} ${args}`, { cwd });
  return { stdout, stderr, exitCode: 0 };
}

async function runCliExpectFailure(args, cwd = process.cwd()) {
  try {
    await execAsync(`node ${new URL("../bin/workflow.js", import.meta.url).pathname} ${args}`, { cwd });
    return { stdout: "", stderr: "", exitCode: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", exitCode: error.code ?? 1 };
  }
}

test("CLI --assert-status passes when status is allowed", async () => {
  const projectRoot = await projectFixture();
  const { stdout, exitCode } = await runCli(`--assert-status REQ-0001 --status accepted --status planned`, projectRoot);
  assert.equal(exitCode, 0);
  assert.match(stdout, /Requirement REQ-0001 status is allowed/);
});

test("CLI --assert-status fails when status is not allowed", async () => {
  const projectRoot = await projectFixture();
  const { stderr, exitCode } = await runCliExpectFailure(`--assert-status REQ-0001 --status planned`, projectRoot);
  assert.equal(exitCode, 1);
  assert.match(stderr, /which is not allowed/);
});

test("CLI --assert-status fails when requirement is missing", async () => {
  const projectRoot = await projectFixture();
  const { stderr, exitCode } = await runCliExpectFailure(`--assert-status REQ-9999 --status accepted`, projectRoot);
  assert.equal(exitCode, 1);
  assert.match(stderr, /does not exist/);
});

test("CLI --assert-status requires at least one --status", async () => {
  const projectRoot = await projectFixture();
  const { stderr, exitCode } = await runCliExpectFailure(`--assert-status REQ-0001`, projectRoot);
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
  test(`Skill ${name} includes execution contract with --validate${asserts ? " and --assert-status" : ""}`, async () => {
    const path = new URL(`../skills/${name}/SKILL.md`, import.meta.url);
    const content = await readFile(path, "utf8");
    assert.match(content, /--validate/);
    assert.match(content, /Execution contract/);
    assert.match(content, /MUST enforce this contract/);
    if (asserts) {
      assert.match(content, /--assert-status/);
    }
  });
}
