---
id: REQ-0001
title: Reorganize workflow documents into docs/changes
status: planned
complexity: complex
risk_tags:
  - architecture
  - migration
plan_required: true
plan_reason: "The workflow document root, validator, installer, orchestrator, Skills, and docs all change together."
created_at: 2026-06-21
updated_at: 2026-06-21
references:
  - docs/superpowers/specs/2026-06-21-docs-changes-workflow-design.md
  - docs/superpowers/plans/2026-06-21-docs-changes-workflow.md
specs: []
history:
  - date: 2026-06-21
    from: null
    to: draft
    note: Initial proposal created from approved docs/changes workflow design.
  - date: 2026-06-21
    from: draft
    to: accepted
    note: User approved stable REQ-numbered docs/changes directories.
  - date: 2026-06-21
    from: accepted
    to: planned
    note: Implementation plan approved for execution.
---

# REQ-0001：Reorganize workflow documents into docs/changes

## 原始需求

用户希望借鉴 OpenSpec 的“变更包”思路，但不引入完整 OpenSpec 兼容层；业务文档从隐藏的 `.workflow/` 中抽出，放到项目根目录的 `docs/changes/REQ-xxxx-title/`，并保留当前项目治理能力。

## 背景与目标

当前结构把 requirement、plan、implementation 分散在 `.workflow/` 下。新结构将一个需求的 proposal、design、tasks、implementation、verification 和增量 specs 聚合到一个变更包，便于 GitHub 浏览、PR 审查和长期归档。

## 范围

### 做什么

- 初始化 `docs/changes/`、`docs/changes/archive/` 和 `docs/specs/`。
- 让 installer、validator、orchestrator、Skills 和公开文档使用新路径。
- 让 `.workflow/` 只承担治理、模板、索引和入口职责。
- 创建本仓库自己的首个变更包。

### 不做什么

- 不兼容 OpenSpec CLI 或命令。
- 不保留旧的业务产物目录作为真源。
- 不执行 npm publish。

## 验收标准

- 初始化后同时拥有 `.workflow/` 治理骨架和 `docs/` 文档骨架。
- `workflow-template --validate` 从 `docs/changes/*/proposal.md` 校验状态和阶段产物。
- `--sync-index` 与 `--sync-current` 生成指向 `docs/changes/` 的链接。
- 六个 workflow Skills 使用 proposal、design、tasks、implementation、verification 和 archive 的新落点。
- `npm run check`、`npm test`、`npm run pack:check` 通过。

