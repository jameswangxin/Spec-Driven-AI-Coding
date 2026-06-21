# Workflow Index

## Purpose

This directory is the governance entry point for workflow state, validation, templates, Agent context, and external Skill integrations.

业务文档真源位于 `docs/changes/` 和 `docs/specs/`；`.workflow/` 只维护治理、索引和当前入口。

长期入口见：

- [项目地图](project.md)
- [流程手册](playbook.md)

## Active Work

<!-- workflow:active-work:start -->
当前没有活动需求。请基于 `docs/changes/REQ-0001-title/` 创建目标项目的第一个变更包。

| ID | Title | Status | Change | Design | Tasks | Verification |
| --- | --- | --- | --- | --- | --- | --- |
<!-- workflow:active-work:end -->

## Requirement Status Flow

Main flow:

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

Extended flow:

```text
draft|accepted|planned|implemented -> canceled
accepted|planned|implemented -> blocked
blocked -> accepted|planned|implemented
verified -> reopened
reopened -> planned|implemented|verified
draft|accepted|planned -> superseded
```

All extended state transitions must be recorded in proposal `history`.

## Planning Rule

A requirement needs a design and tasks when `complexity` is `medium` or `complex`, or when `risk_tags` includes `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.

Simple low-risk requirements may skip a design only when the proposal records `plan_required: false` and explains the reason.

## Effective Specs

<!-- workflow:specs:start -->
| Domain | Spec |
| --- | --- |
<!-- workflow:specs:end -->

## Templates

| Template | Purpose |
| --- | --- |
| [proposal.md](templates/proposal.md) | 变更提案 |
| [design.md](templates/design.md) | 技术设计 |
| [tasks.md](templates/tasks.md) | 实施任务 |
| [implementation.md](templates/implementation.md) | 实施记录 |
| [verification.md](templates/verification.md) | 验证记录 |
| [spec.md](templates/spec.md) | 领域规范 |

## External Skill Integrations

| Integration | Purpose |
| --- | --- |
| [superpowers.md](integrations/superpowers.md) | Superpowers Skill 的本项目产出物映射规则 |
| [trellis.md](integrations/trellis.md) | Trellis 归档需求 Skill 的本项目适配规则 |

## Governance

| File | Purpose |
| --- | --- |
| [workflow-checklist.md](checks/workflow-checklist.md) | 工作流一致性检查清单 |
| [requirement.schema.json](schema/requirement.schema.json) | Proposal frontmatter schema |
| [git.md](git.md) | Git / PR 最小集成约定 |
