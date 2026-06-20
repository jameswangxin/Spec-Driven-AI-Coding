# REQ-0001 技术方案

## 1. 目标

让 `.workflow/` 目录成为本仓库自身需求、方案、实施和验证的真源，并确保工作流 CLI 能够成功校验、同步索引与当前上下文。

完成标志：

- `.workflow/index.md` 与 `.workflow/current.md` 包含正确的 `workflow:*:start/end` 受管理标记。
- `.workflow/requirements/REQ-0001.md`、`.workflow/plans/REQ-0001-plan.md`、`.workflow/implementations/REQ-0001-implementation.md` 存在且内容完整。
- `node bin/workflow.js --validate`、`--sync-index`、`--sync-current REQ-0001` 与 `npm test` 均通过。

## 2. 非目标

- 不修改 `lib/validator.js` 或 `bin/workflow.js` 的校验/同步逻辑。
- 不修改全局 Superpowers Skill。
- 不引入新的能力规格（CAP）。
- 不重构 docs 目录下的其他文件（仅迁移与本需求直接相关的计划）。

## 3. 改动范围

### 文件 / 模块

- `.workflow/index.md`：为 Active Work 与 Capability Specs 表补全受管理标记。
- `.workflow/current.md`：为 Current Requirement 区块补全受管理标记。
- `.workflow/requirements/REQ-0001.md`：新建需求记录。
- `.workflow/plans/REQ-0001-plan.md`：新建技术方案，迁入原 docs 计划的有效内容。
- `.workflow/implementations/REQ-0001-implementation.md`：新建实施记录。
- `docs/superpowers/plans/2026-06-20-workflow-enforcement.md`：内容迁入 plan 后删除，避免与 `.workflow/` 真源冲突。

### 行为变化

- `node bin/workflow.js --sync-index` 不再报 `Missing workflow marker pair`，而是重写 index 中受管理区块。
- `node bin/workflow.js --sync-current REQ-0001` 不再报错，而是将 current 的 Current Requirement 指向 REQ-0001。
- 本仓库的变更历史可通过 REQ-0001 进行审计。

### 影响对象

- 用户/Agent：后续从 `.workflow/current.md` 进入时能直接看到 REQ-0001。
- 系统：CLI 校验与同步能够覆盖本仓库自身的工作流记录。
- 运维/数据：无。

## 4. 方案设计

### 核心思路

沿用 `lib/validator.js` 已经实现的受管理标记机制：

- `syncIndex` 读取 `.workflow/index.md`，找到 `workflow:active-work` 与 `workflow:capabilities` 两个标记对，仅替换标记之间的 Markdown 表格。
- `syncCurrent` 读取 `.workflow/current.md`，找到 `workflow:current` 标记对，仅替换标记之间的当前需求说明。

因此修复的关键是为现有的 index.md/current.md 补全这三个标记对，使同步器有明确的替换边界。

### 需求记录

- 编号 `REQ-0001`，标题描述本次修复的本质。
- `complexity: complex`，`risk_tags` 包含 `architecture` 与 `cross-module`（跨 CLI、Skills、模板与 .workflow 记录）。
- `plan_required: true`。
- `capabilities: []`，避免引用不存在的能力规格导致校验失败。
- `history` 记录 `draft -> accepted -> planned -> implemented -> verified` 的完整状态流。

### 计划迁移

将 `docs/superpowers/plans/2026-06-20-workflow-enforcement.md` 中的四个实现任务（校验器、同步器、CLI 接入、Skills 接入与 dogfooding）转写到 `.workflow/plans/REQ-0001-plan.md` 的「方案设计」与「实施步骤」中，删除原 docs 文件以消除真源冲突。

## 5. 数据流 / 调用链路

```text
Agent/用户发起修复
  -> 编辑 .workflow/index.md 与 current.md 的受管理标记
  -> 创建 .workflow/requirements/REQ-0001.md
  -> 创建 .workflow/plans/REQ-0001-plan.md（迁入 docs 计划内容）
  -> 创建 .workflow/implementations/REQ-0001-implementation.md
  -> node bin/workflow.js --validate
  -> node bin/workflow.js --sync-index
  -> node bin/workflow.js --sync-current REQ-0001
  -> npm test
  -> 更新 implementation 的测试记录
  -> 如通过，将 REQ-0001 状态更新为 verified
```

## 6. 接口 / 数据结构变化

### 新增

- `.workflow/requirements/REQ-0001.md`
- `.workflow/plans/REQ-0001-plan.md`
- `.workflow/implementations/REQ-0001-implementation.md`
- `.workflow/index.md` 与 `.workflow/current.md` 中的受管理标记。

### 修改

- `.workflow/index.md`：Active Work、Capability Specs 表改为可替换区块。
- `.workflow/current.md`：Current Requirement 区块改为可替换区块。

### 删除

- `docs/superpowers/plans/2026-06-20-workflow-enforcement.md`（内容已迁移）。

## 7. 兼容性与迁移

- 兼容性影响：无。
- 数据迁移：无。
- 配置变更：无。

## 8. 风险与回滚

| 风险                                     | 影响                          | 缓解方式                                                             |
| ---------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| frontmatter 格式错误导致 `validate` 失败 | 修复无法通过验收              | 创建后先运行 `--validate` 再同步                                     |
| 受管理标记不匹配导致 `sync-*` 失败       | 索引/当前上下文无法更新       | 对照 scaffold 模板检查标记名称与格式                                 |
| 删除 docs 计划后外部引用断裂             | 其他文档或 Skill 找不到原文件 | 搜索全仓引用，确认无直接依赖后再删除；如有依赖在 implementation 记录 |

回滚方式：

- 若验证失败，保留 index/current 的受管理标记，回滚 requirement 状态到 `implemented` 或 `blocked`，在 implementation 中记录偏差。
- 若 docs 文件删除导致问题，可从 git 历史恢复。

## 9. 测试策略

### 自动化测试

- `node bin/workflow.js --validate`：预期 `Workflow validation passed.`。
- `node bin/workflow.js --sync-index`：预期成功，index 中 Active Work 表出现 REQ-0001。
- `node bin/workflow.js --sync-current REQ-0001`：预期成功，current 中 Current Requirement 指向 REQ-0001。
- `npm test`：预期全部 node:test 用例通过。
- `git diff --check`：预期无输出且退出码为 0。

### 手工验证

- 人工检查 `.workflow/index.md` 与 `.workflow/current.md` 的受管理标记是否正确。
- 人工检查 plan 是否覆盖了原 docs 计划的任务 1–5。

### 不覆盖项与原因

- 不对 `lib/validator.js` 本身进行单元测试补充（已有 `test/validator.test.js` 覆盖）。
- 不覆盖 Skills 的集成运行（超出本次修复范围）。

## 10. 实施步骤

1. 修改 `.workflow/index.md`：
   - 在 Active Work 段落与表格前后加入 `workflow:active-work:start/end`。
   - 在 Capability Specs 表格前后加入 `workflow:capabilities:start/end`。
2. 修改 `.workflow/current.md`：
   - 在 Current Requirement 的“当前目标项目还没有活动需求...”段落前后加入 `workflow:current:start/end`。
3. 创建 `.workflow/requirements/REQ-0001.md`：
   - 填写 frontmatter、原始需求、范围、验收标准、测试用例与变更记录。
4. 创建 `.workflow/plans/REQ-0001-plan.md`：
   - 将 `docs/superpowers/plans/2026-06-20-workflow-enforcement.md` 的任务 1–5 迁入本方案。
5. 创建 `.workflow/implementations/REQ-0001-implementation.md`：
   - 预留测试记录表格。
6. 运行 `node bin/workflow.js --validate` 并记录结果。
7. 运行 `node bin/workflow.js --sync-index` 与 `--sync-current REQ-0001` 并记录结果。
8. 运行 `npm test` 与 `git diff --check` 并记录结果。
9. 将验证结果填入 implementation 的测试记录。
10. 如全部通过，将 REQ-0001 的 `status` 更新为 `verified`，并在 `history` 中追加状态变化。
11. 删除 `docs/superpowers/plans/2026-06-20-workflow-enforcement.md`。
12. 再次运行 `node bin/workflow.js --validate` 确认无回归。
