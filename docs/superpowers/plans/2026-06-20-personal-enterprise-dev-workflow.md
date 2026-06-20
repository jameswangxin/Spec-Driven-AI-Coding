# Personal Enterprise Development Workflow 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 建立项目内 `.workflow/` 文件协议，让需求、方案、实施记录、能力规格和 Agent 当前上下文拥有稳定、可追踪的记录结构。

**架构：** 使用 `.workflow/` 作为唯一真源目录，`index.md` 提供长期总览，`current.md` 提供 Agent 编码前入口。需求、方案、实施记录和能力规格分别放入专用子目录，并通过固定 Markdown 模板保持一致。

**技术栈：** Markdown、YAML frontmatter、Git、shell 验证命令。

---

## 文件结构

- 创建：`.workflow/index.md`
  - 职责：长期总览，列出需求、能力规格、状态、引用关系和工作流规则入口。
- 创建：`.workflow/current.md`
  - 职责：Agent 每次编码前读取的固定入口，指向当前需求、必读上下文、允许范围、风险和验证要求。
- 创建：`.workflow/requirements/REQ-0001.md`
  - 职责：首个需求，记录建立工作流骨架本身的需求、状态、复杂度、风险标签和历史。
- 创建：`.workflow/plans/REQ-0001-plan.md`
  - 职责：首个需求的方案，说明目录协议、边界、测试策略和风险。
- 创建：`.workflow/implementations/REQ-0001-implementation.md`
  - 职责：首个需求的实施记录，实施时追加改动范围、验证命令、风险和后续事项。
- 创建：`.workflow/capabilities/CAP-0001.md`
  - 职责：记录“Agent 编码前上下文入口”这个可复用能力规格。
- 创建：`.workflow/templates/requirement.md`
  - 职责：新需求模板。
- 创建：`.workflow/templates/plan.md`
  - 职责：方案模板。
- 创建：`.workflow/templates/implementation.md`
  - 职责：实施记录模板。
- 创建：`.workflow/templates/capability.md`
  - 职责：能力规格模板。
- 修改：`.gitignore`
  - 职责：忽略 macOS `.DS_Store`，避免工作流仓库出现无关文件。

## 任务 1：清理仓库忽略规则

**文件：**
- 创建：`.gitignore`

- [ ] **步骤 1：编写忽略规则**

创建 `.gitignore`：

```gitignore
.DS_Store
```

- [ ] **步骤 2：验证忽略规则**

运行：

```bash
git status --short --ignored
```

预期：`.DS_Store`、`docs/.DS_Store`、`docs/superpowers/.DS_Store` 显示为 ignored，`.gitignore` 显示为未跟踪。

- [ ] **步骤 3：Commit**

```bash
git add .gitignore
git commit -m "chore: ignore local macos files"
```

## 任务 2：创建 `.workflow/` 目录骨架和索引入口

**文件：**
- 创建：`.workflow/index.md`
- 创建：`.workflow/current.md`

- [ ] **步骤 1：创建 `.workflow/index.md`**

```markdown
# Workflow Index

## Purpose

This directory is the source of truth for requirements, plans, implementation records, capability specs, and Agent pre-coding context.

## Active Work

| ID | Title | Status | Plan | Implementation | Capabilities |
| --- | --- | --- | --- | --- | --- |
| REQ-0001 | Establish project-local workflow protocol | planned | [plan](plans/REQ-0001-plan.md) | [implementation](implementations/REQ-0001-implementation.md) | [CAP-0001](capabilities/CAP-0001.md) |

## Requirement Status Flow

draft -> accepted -> planned -> implemented -> verified -> archived

## Planning Rule

A requirement needs a plan when `complexity` is `medium` or `complex`, or when `risk_tags` includes `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.

## Capability Specs

| ID | Title | Status | Introduced By |
| --- | --- | --- | --- |
| CAP-0001 | Agent pre-coding context entry point | active | REQ-0001 |
```

- [ ] **步骤 2：创建 `.workflow/current.md`**

```markdown
# Current Workflow Context

## Current Requirement

- Requirement: [REQ-0001](requirements/REQ-0001.md)
- Plan: [REQ-0001 plan](plans/REQ-0001-plan.md)
- Implementation record: [REQ-0001 implementation](implementations/REQ-0001-implementation.md)
- Required capability context: [CAP-0001](capabilities/CAP-0001.md)

## Required Reading Before Coding

1. `.workflow/current.md`
2. `.workflow/requirements/REQ-0001.md`
3. `.workflow/plans/REQ-0001-plan.md`
4. `.workflow/capabilities/CAP-0001.md`

## Allowed Scope

- Create the initial `.workflow/` file protocol.
- Create templates for requirements, plans, implementation records, and capability specs.
- Record verification in `.workflow/implementations/REQ-0001-implementation.md`.

## Out of Scope

- Building a CLI.
- Automating state transitions.
- Integrating GitHub issues, pull requests, or CI.

## Known Risks

- The protocol may become too heavy for personal work if templates include unnecessary fields.
- Manual checks can drift until a future CLI validator exists.

## Required Verification

- Confirm every referenced `REQ-*` and `CAP-*` file exists.
- Confirm templates contain the required sections from the approved design spec.
- Run repository status checks before commit.
```

- [ ] **步骤 3：验证入口文件存在**

运行：

```bash
test -f .workflow/index.md && test -f .workflow/current.md
```

预期：命令退出码为 `0`，没有输出。

- [ ] **步骤 4：Commit**

```bash
git add .workflow/index.md .workflow/current.md
git commit -m "docs: add workflow entry points"
```

## 任务 3：创建首个需求和方案

**文件：**
- 创建：`.workflow/requirements/REQ-0001.md`
- 创建：`.workflow/plans/REQ-0001-plan.md`

- [ ] **步骤 1：创建 `.workflow/requirements/REQ-0001.md`**

```markdown
---
id: REQ-0001
title: Establish project-local workflow protocol
status: planned
complexity: medium
risk_tags: [architecture]
created_at: 2026-06-20
updated_at: 2026-06-20
references:
  - docs/superpowers/specs/2026-06-20-personal-enterprise-dev-workflow-design.md
capabilities:
  - CAP-0001
history:
  - date: 2026-06-20
    from: null
    to: draft
    note: Initial requirement captured from workflow design discussion.
  - date: 2026-06-20
    from: draft
    to: accepted
    note: User approved the single-directory workflow protocol direction.
  - date: 2026-06-20
    from: accepted
    to: planned
    note: Approved design spec requires a plan because complexity is medium and risk includes architecture.
---

# REQ-0001: Establish Project-Local Workflow Protocol

## Requirement

Create a `.workflow/` directory protocol that separates requirements from implementation plans and records Agent-ready context before coding.

## Acceptance Criteria

- The repository has `index.md` and `current.md` workflow entry points.
- The repository has dedicated directories for requirements, plans, implementation records, capability specs, and templates.
- Medium, complex, or high-risk work has a plan before implementation.
- Implementation records capture scope, verification, risks, and follow-ups.
- Future requirements can reference prior `REQ-*` files and `CAP-*` capability specs.

## Notes

This requirement implements the approved design spec, not a CLI or automation layer.
```

- [ ] **步骤 2：创建 `.workflow/plans/REQ-0001-plan.md`**

```markdown
# REQ-0001 Plan

## Goal

Create the initial `.workflow/` file protocol for stable Agent context, traceable requirements, plans, implementation records, and reusable capability specs.

## Non-Goals

- Do not build a CLI.
- Do not automate status transitions.
- Do not integrate GitHub issues, pull requests, or CI.
- Do not add multi-user approval workflow.

## Change Scope

- Add `.workflow/index.md` and `.workflow/current.md`.
- Add `REQ-0001`, its plan, implementation record, and `CAP-0001`.
- Add templates for requirement, plan, implementation, and capability files.
- Add `.gitignore` for local macOS metadata.

## Design Decisions

- Use a single `.workflow/` directory as the source of truth.
- Use `REQ-0001` style increasing requirement IDs.
- Use separate `CAP-0001` style IDs for reusable capabilities.
- Require plans for `medium`, `complex`, or high-risk requirements.
- Keep templates short so the workflow stays usable for personal development.

## Test Strategy

- Use shell checks to confirm expected files exist.
- Use `rg` checks to confirm required template sections exist.
- Use `git status --short` to confirm only intended files are staged before each commit.

## Risks and Rollback

- Risk: The process may feel heavy for small changes.
  - Mitigation: Allow `simple` low-risk requirements to skip plans with `plan_required: false`.
- Risk: Manual checks may drift.
  - Mitigation: Keep check rules explicit in `index.md` and implementation records until a future CLI exists.
- Rollback: Revert the commits that add `.workflow/` files and `.gitignore`.
```

- [ ] **步骤 3：验证需求和方案引用**

运行：

```bash
test -f .workflow/requirements/REQ-0001.md && test -f .workflow/plans/REQ-0001-plan.md
rg -n "status: planned|risk_tags: \\[architecture\\]|## Test Strategy" .workflow/requirements/REQ-0001.md .workflow/plans/REQ-0001-plan.md
```

预期：`test` 命令退出码为 `0`；`rg` 输出包含 `status: planned`、`risk_tags: [architecture]`、`## Test Strategy`。

- [ ] **步骤 4：Commit**

```bash
git add .workflow/requirements/REQ-0001.md .workflow/plans/REQ-0001-plan.md
git commit -m "docs: add initial workflow requirement and plan"
```

## 任务 4：创建能力规格和实施记录

**文件：**
- 创建：`.workflow/capabilities/CAP-0001.md`
- 创建：`.workflow/implementations/REQ-0001-implementation.md`

- [ ] **步骤 1：创建 `.workflow/capabilities/CAP-0001.md`**

```markdown
---
id: CAP-0001
title: Agent pre-coding context entry point
status: active
introduced_by: REQ-0001
updated_by: []
---

# CAP-0001: Agent Pre-Coding Context Entry Point

## Boundary

Agents must start implementation work from `.workflow/current.md` and follow its required reading list before editing code or workflow files.

## Usage

1. Read `.workflow/current.md`.
2. Read the active requirement.
3. Read the required plan when one is listed or required by the planning rule.
4. Read referenced capability specs.
5. Keep changes inside the allowed scope or update the plan before continuing.

## Dependencies

- `.workflow/index.md`
- `.workflow/current.md`
- Requirement files in `.workflow/requirements/`
- Plan files in `.workflow/plans/`
- Capability files in `.workflow/capabilities/`

## Constraints

- Do not implement a requirement that is still `draft`.
- Do not implement a medium, complex, or high-risk requirement without a plan.
- Do not mark work verified without recording actual verification.

## Example References

    references:
      - REQ-0001
    capabilities:
      - CAP-0001
```

- [ ] **步骤 2：创建 `.workflow/implementations/REQ-0001-implementation.md`**

```markdown
# REQ-0001 Implementation

## Scope Changed

- pending

## Commits / PRs

- commit: pending
- PR: not applicable

## Tests

- pending

## Risks

- Manual workflow checks can drift until a future validator exists.

## Follow-ups

- Consider a future requirement for a CLI validator after the file protocol is used in real work.
```

- [ ] **步骤 3：验证能力和实施记录章节**

运行：

```bash
test -f .workflow/capabilities/CAP-0001.md && test -f .workflow/implementations/REQ-0001-implementation.md
rg -n "## Boundary|## Usage|## Scope Changed|## Tests|## Risks" .workflow/capabilities/CAP-0001.md .workflow/implementations/REQ-0001-implementation.md
```

预期：`test` 命令退出码为 `0`；`rg` 输出包含能力规格和实施记录的关键章节。

- [ ] **步骤 4：Commit**

```bash
git add .workflow/capabilities/CAP-0001.md .workflow/implementations/REQ-0001-implementation.md
git commit -m "docs: add initial workflow capability and implementation record"
```

## 任务 5：创建四类模板

**文件：**
- 创建：`.workflow/templates/requirement.md`
- 创建：`.workflow/templates/plan.md`
- 创建：`.workflow/templates/implementation.md`
- 创建：`.workflow/templates/capability.md`

- [ ] **步骤 1：创建 `.workflow/templates/requirement.md`**

```markdown
---
id: REQ-0000
title: Replace with requirement title
status: draft
complexity: simple
risk_tags: []
plan_required: false
plan_reason: "Simple low-risk change."
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
references: []
capabilities: []
history:
  - date: YYYY-MM-DD
    from: null
    to: draft
    note: Initial creation.
---

# REQ-0000: Replace with Requirement Title

## Requirement

Describe the required change.

## Acceptance Criteria

- Describe an observable result.

## Notes

Add constraints, context, or links that future Agents must know.
```

- [ ] **步骤 2：创建 `.workflow/templates/plan.md`**

```markdown
# REQ-0000 Plan

## Goal

State what this plan will deliver.

## Non-Goals

- State what this plan will not change.

## Change Scope

- List files, modules, or behaviors expected to change.

## Design Decisions

- Record decisions that constrain implementation.

## Test Strategy

- List exact commands or verification methods expected after implementation.

## Risks and Rollback

- Risk: Describe a concrete risk.
  - Mitigation: Describe how implementation reduces it.
- Rollback: Describe how to undo the change.
```

- [ ] **步骤 3：创建 `.workflow/templates/implementation.md`**

```markdown
# REQ-0000 Implementation

## Scope Changed

- List changed files, directories, or behaviors.

## Commits / PRs

- commit: pending
- PR: pending

## Tests

- `command`: result

## Risks

- List residual risk after implementation.

## Follow-ups

- Link follow-up requirements or write `none`.
```

- [ ] **步骤 4：创建 `.workflow/templates/capability.md`**

```markdown
---
id: CAP-0000
title: Replace with capability title
status: active
introduced_by: REQ-0000
updated_by: []
---

# CAP-0000: Replace with Capability Title

## Boundary

Define what this capability covers and excludes.

## Usage

Describe how future requirements or Agents should use it.

## Dependencies

- List required files, modules, or prior capabilities.

## Constraints

- List rules future changes must preserve.

## Example References

    references:
      - REQ-0000
    capabilities:
      - CAP-0000
```

- [ ] **步骤 5：验证模板章节**

运行：

```bash
test -f .workflow/templates/requirement.md && test -f .workflow/templates/plan.md && test -f .workflow/templates/implementation.md && test -f .workflow/templates/capability.md
rg -n "## Acceptance Criteria|## Test Strategy|## Scope Changed|## Boundary" .workflow/templates
```

预期：四个 `test` 检查全部通过；`rg` 输出包含每类模板的关键章节。

- [ ] **步骤 6：Commit**

```bash
git add .workflow/templates/requirement.md .workflow/templates/plan.md .workflow/templates/implementation.md .workflow/templates/capability.md
git commit -m "docs: add workflow document templates"
```

## 任务 6：完成实施记录并验证整体协议

**文件：**
- 修改：`.workflow/implementations/REQ-0001-implementation.md`
- 修改：`.workflow/requirements/REQ-0001.md`
- 修改：`.workflow/index.md`

- [ ] **步骤 1：更新实施记录**

将 `.workflow/implementations/REQ-0001-implementation.md` 改为：

```markdown
# REQ-0001 Implementation

## Scope Changed

- `.gitignore`: ignored local macOS metadata.
- `.workflow/index.md`: added workflow overview, requirement status flow, planning rule, and capability index.
- `.workflow/current.md`: added Agent pre-coding context entry point.
- `.workflow/requirements/REQ-0001.md`: recorded the initial workflow requirement.
- `.workflow/plans/REQ-0001-plan.md`: recorded the required plan for medium architecture work.
- `.workflow/capabilities/CAP-0001.md`: recorded the Agent pre-coding context capability.
- `.workflow/templates/*`: added templates for requirements, plans, implementation records, and capabilities.

## Commits / PRs

- commit: pending final verification commit
- PR: not applicable

## Tests

- `test -f .workflow/index.md && test -f .workflow/current.md`: pending
- `test -f .workflow/requirements/REQ-0001.md && test -f .workflow/plans/REQ-0001-plan.md`: pending
- `test -f .workflow/capabilities/CAP-0001.md && test -f .workflow/implementations/REQ-0001-implementation.md`: pending
- `test -f .workflow/templates/requirement.md && test -f .workflow/templates/plan.md && test -f .workflow/templates/implementation.md && test -f .workflow/templates/capability.md`: pending
- `rg -n "REQ-0001|CAP-0001" .workflow/index.md .workflow/current.md .workflow/requirements/REQ-0001.md .workflow/capabilities/CAP-0001.md`: pending

## Risks

- Manual workflow checks can drift until a future validator exists.

## Follow-ups

- Consider a future requirement for a CLI validator after the file protocol is used in real work.
```

- [ ] **步骤 2：运行整体验证**

运行：

```bash
test -f .workflow/index.md && test -f .workflow/current.md
test -f .workflow/requirements/REQ-0001.md && test -f .workflow/plans/REQ-0001-plan.md
test -f .workflow/capabilities/CAP-0001.md && test -f .workflow/implementations/REQ-0001-implementation.md
test -f .workflow/templates/requirement.md && test -f .workflow/templates/plan.md && test -f .workflow/templates/implementation.md && test -f .workflow/templates/capability.md
rg -n "REQ-0001|CAP-0001" .workflow/index.md .workflow/current.md .workflow/requirements/REQ-0001.md .workflow/capabilities/CAP-0001.md
```

预期：所有 `test` 命令退出码为 `0`；`rg` 输出所有文件中的 `REQ-0001` 和 `CAP-0001` 引用。

- [ ] **步骤 3：把验证结果写回实施记录**

将 `.workflow/implementations/REQ-0001-implementation.md` 的 `Tests` 区域从 `pending` 改为实际结果：

```markdown
## Tests

- `test -f .workflow/index.md && test -f .workflow/current.md`: passed
- `test -f .workflow/requirements/REQ-0001.md && test -f .workflow/plans/REQ-0001-plan.md`: passed
- `test -f .workflow/capabilities/CAP-0001.md && test -f .workflow/implementations/REQ-0001-implementation.md`: passed
- `test -f .workflow/templates/requirement.md && test -f .workflow/templates/plan.md && test -f .workflow/templates/implementation.md && test -f .workflow/templates/capability.md`: passed
- `rg -n "REQ-0001|CAP-0001" .workflow/index.md .workflow/current.md .workflow/requirements/REQ-0001.md .workflow/capabilities/CAP-0001.md`: passed
```

- [ ] **步骤 4：更新需求状态为 verified**

在 `.workflow/requirements/REQ-0001.md` 中更新 frontmatter：

```yaml
status: verified
updated_at: 2026-06-20
```

并在 `history` 末尾追加：

```yaml
  - date: 2026-06-20
    from: planned
    to: implemented
    note: Initial workflow protocol files were created.
  - date: 2026-06-20
    from: implemented
    to: verified
    note: File existence and reference checks passed.
```

- [ ] **步骤 5：更新索引状态**

在 `.workflow/index.md` 的 Active Work 表格中把 `REQ-0001` 状态从 `planned` 改为 `verified`。

- [ ] **步骤 6：最终状态检查**

运行：

```bash
git status --short
```

预期：只显示 `.workflow/` 内本任务修改的文件。

- [ ] **步骤 7：Commit**

```bash
git add .workflow/index.md .workflow/requirements/REQ-0001.md .workflow/implementations/REQ-0001-implementation.md
git commit -m "docs: verify initial workflow protocol"
```

## 自检清单

- 规格中的 `.workflow/` 目录结构由任务 2 到任务 5 覆盖。
- `index.md` 和 `current.md` 由任务 2 覆盖。
- 编号、状态、历史记录由任务 3 和任务 6 覆盖。
- 方案触发规则由任务 2 和任务 3 覆盖。
- 实施记录、测试和风险由任务 4 和任务 6 覆盖。
- 能力规格和后续引用由任务 4 覆盖。
- 模板由任务 5 覆盖。
- `.DS_Store` 噪音由任务 1 覆盖。
