# `docs/changes` 工作流实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将业务需求产物迁移为 `docs/changes/REQ-xxxx-title/` 变更包，`.workflow/` 只保留治理能力。

**架构：** `proposal.md` 是状态机记录；`design.md`、`tasks.md`、`implementation.md` 和 `verification.md` 分别保存阶段产物。CLI 仍接收 `.workflow/`，通过其父目录定位 `docs/`。

**技术栈：** Node.js 20、ESM、`node:test`、AJV 2020、YAML。

---

## 任务 1：用测试锁定双根目录

**文件：** 修改 `test/installer.test.js`、`test/validator.test.js`、`test/orchestrator.test.js`。

- [ ] **步骤 1：写失败测试。** 完整安装后断言以下目录存在：

```js
assert.equal(await exists(join(target, 'docs', 'changes')), true);
assert.equal(await exists(join(target, 'docs', 'changes', 'archive')), true);
assert.equal(await exists(join(target, 'docs', 'specs')), true);
```

增加 `docs` 指向项目外目录的符号链接测试；`install({ target, initOnly: true })` 必须以 `/symbolic link/i` 拒绝。

- [ ] **步骤 2：改造 fixture。** validator 和 orchestrator fixture 创建 `<root>/.workflow/`，并创建 `<root>/docs/changes/REQ-0001-example/proposal.md`；调用保持 `validateWorkflow(join(root, '.workflow'))`。

- [ ] **步骤 3：写编排器断言。** `loadOrchestrationContext()` 的 requirement 路径必须是 proposal，plan 路径必须是同目录 `design.md`；缺少 proposal 时抛出 `WF_REQUIREMENT_MISSING`。

- [ ] **步骤 4：运行并确认失败。**

```bash
node --test test/installer.test.js test/validator.test.js test/orchestrator.test.js
```

预期：FAIL，现有代码仍读取 `.workflow/requirements/` 和 `plans/`。

## 任务 2：实现路径解析、安装器和模板

**文件：** 创建 `template/docs/scaffold/{changes,changes/archive,specs}/.gitkeep`；创建 `template/workflow/document-templates/{proposal,design,tasks,verification,spec}.md`；修改 `lib/installer.js`、`lib/validator.js` 与 `test/installer.test.js`。

- [ ] **步骤 1：导出路径解析函数。** 在 `lib/validator.js` 添加：

```js
export function workflowPaths(workflowRoot) {
  const projectRoot = dirname(workflowRoot);
  const docsRoot = join(projectRoot, 'docs');
  return { projectRoot, workflowRoot, docsRoot, changesRoot: join(docsRoot, 'changes'), archiveRoot: join(docsRoot, 'changes', 'archive'), specsRoot: join(docsRoot, 'specs') };
}
```

- [ ] **步骤 2：实现 docs 安装映射。** `targetPaths()` 增加 `docs: join(base, 'docs')`，`assertSafeOutputPaths()` 拒绝 docs 符号链接。安装映射增加 `template/docs/scaffold -> docs`；卸载只删除 `.gitkeep`，保留非空的 `docs/changes/`。

- [ ] **步骤 3：编写模板。** `proposal.md` 沿用 requirement frontmatter，删除 `capabilities`，新增 `specs: []`；design 包含目标、非目标、范围、方案、数据流、兼容性、风险和测试；tasks 为可勾选任务；verification 包含命令、结果、替代验证、风险和后续项；spec 包含新增、修改、移除需求。

- [ ] **步骤 4：运行测试。**

```bash
node --test test/installer.test.js
```

预期：PASS；`--init-only` 初始化 `.workflow/` 和 `docs/`，不安装 Skills。

## 任务 3：实现变更包校验、索引和当前入口

**文件：** 修改 `lib/validator.js`、`.workflow/schema/requirement.schema.json`、`template/workflow/governance/schema/requirement.schema.json`、`test/validator.test.js`、`template/workflow/scaffold/index.md`、`template/workflow/scaffold/current.md`。

- [ ] **步骤 1：写失败测试。** 分别断言缺失产物产生 `WF_DESIGN_MISSING`、`WF_TASKS_MISSING`、`WF_IMPLEMENTATION_MISSING`、`WF_VERIFICATION_MISSING`、`WF_ARCHIVE_LOCATION_INVALID`、`WF_CHANGE_DIRECTORY_INVALID`。

- [ ] **步骤 2：实现 `loadChanges(paths)`。** 它读取 `docs/changes/REQ-*/proposal.md` 和 `docs/changes/archive/*-REQ-*/proposal.md`，并返回 `{ path, filename, changeDir, archived, data }`。删除 capability 读取、`WF_CAPABILITY_*` 检查和 capability schema；proposal schema 改用可选字符串数组 `specs`。

- [ ] **步骤 3：实现规则。** 活动目录匹配 `REQ-` 加四位编号和 slug，且编号与 proposal `id` 一致。`planned` 需要 design 和 tasks；`implemented` 需要 implementation；`verified` 需要 verification；`archived` 必须位于 `docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/`。

- [ ] **步骤 4：重写同步输出。** `syncIndex()` 输出 ID、Title、Status、Change、Design、Tasks、Verification 六列，链接均从 `.workflow/index.md` 指向 `../docs/changes/`。将 capability marker 改为 `workflow:specs`，列出 `docs/specs/*/spec.md`。`syncCurrent()` 输出 proposal、design 和 tasks 的相对链接。

- [ ] **步骤 5：运行测试。**

```bash
node --test test/validator.test.js
```

预期：PASS。

## 任务 4：更新编排器和 CLI

**文件：** 修改 `lib/orchestrator.js`、`bin/workflow.js`、`test/orchestrator.test.js`。

- [ ] **步骤 1：复用变更包加载。** `loadOrchestrationContext()` 从 proposal 取 requirement，使用 `join(requirement.changeDir, 'design.md')` 取 plan。已归档变更可读取，`inferNextStep()` 保持 archived 的 no-op。审计日志继续写 `.workflow/audit/executions/`。

- [ ] **步骤 2：更新 CLI 帮助。** `--init-only` 改为初始化 `.workflow/` 治理文件和 `docs/` 骨架；`--validate` 改为校验变更包、状态和引用。选项与函数签名保持不变。

- [ ] **步骤 3：运行测试。**

```bash
node --test test/orchestrator.test.js test/validator.test.js
```

预期：PASS。

## 任务 5：更新治理、Skills 和仓库自身示例

**文件：** 修改根目录和模板中的 `index.md`、`current.md`、`project.md`、`playbook.md`、检查清单、integrations；修改六个 `skills/workflow-*/SKILL.md`；创建 `docs/changes/REQ-0001-workflow-docs-reorganization/`；删除旧业务目录和模板。

- [ ] **步骤 1：更新治理文件。** `.workflow/` 只描述状态机、模板、校验与入口；`docs/changes/` 和 `docs/specs/` 是业务文档真源。active 文件只保存链接、分支和验证命令。

- [ ] **步骤 2：统一 Skill 落点。** `workflow-new` 和 `workflow-confirm` 写 proposal；`workflow-plan` 写 design、tasks、增量 specs；`workflow-exec` 写 tasks 与 implementation；`workflow-check` 写 verification；`workflow-archive` 先更新 `docs/specs/` 再移动整个变更包到 archive。

- [ ] **步骤 3：建立本仓库工作包。** 创建 `REQ-0001-workflow-docs-reorganization`，proposal 为 `planned`，design 链接已批准设计，tasks 对应本计划。implementation 与 verification 使用模板且明确未执行，不得伪造验证结果。

- [ ] **步骤 4：扫描路径与测试。**

```bash
rg -n '\.workflow/(requirements|plans|implementations|capabilities)|templates/(requirement|plan|implementation|capability)\.md' .workflow template skills
node --test test/installer.test.js test/validator.test.js
```

预期：第一条命令没有旧业务路径匹配；测试 PASS。

## 任务 6：更新公开文档并做全量验证

**文件：** 修改 `README.md`、`docs/usage.md`、`docs/architecture.md`；仅在 `package.json#files` 不包含 `template` 时修改 `package.json`。

- [ ] **步骤 1：补发布模板测试。** installer 测试断言 `template/docs/scaffold/changes/.gitkeep` 与 `template/workflow/document-templates/proposal.md` 存在。

- [ ] **步骤 2：更新文档。** README 展示 `.workflow/` 治理层和 `docs/` 业务文档层；usage 更新安装、手动复制、创建首个变更包和归档；architecture 的模板树增加 `template/docs/`。不得声明兼容 OpenSpec CLI。

- [ ] **步骤 3：检查发布范围。** 当前 `package.json#files` 已包含 `template`，不改 package 元数据；确认 `template/docs/` 会随包发布。

- [ ] **步骤 4：全量验证。**

```bash
npm run check
npm test
npm run pack:check
git diff --check
```

预期：全部退出码为 `0`，dry-run 包含新 docs 骨架、新模板、Skills 和 README。

- [ ] **步骤 5：审阅范围。**

```bash
git status --short
git diff --stat
git diff --check
```

预期：仅包含工作流目录模型、模板、CLI、测试、Skills 和文档变更，不含依赖升级或无关格式化。
