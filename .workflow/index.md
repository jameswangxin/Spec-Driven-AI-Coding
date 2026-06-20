# Workflow Index

## Purpose

This directory is the source of truth for requirements, plans, implementation records, capability specs, Agent context, and external Skill integrations.

本目录是目标项目的工作流真源。初始化后，请从 `REQ-0001` 开始记录目标项目自己的需求，不要复制模板仓库的历史需求。

长期入口见：

- [项目地图](project.md)
- [流程手册](playbook.md)

## Active Work

<!-- workflow:active-work:start -->
| ID | Title | Status | Plan | Implementation | Capabilities |
| --- | --- | --- | --- | --- | --- |
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

All extended state transitions must be recorded in requirement `history`.

## Planning Rule

A requirement needs a plan when `complexity` is `medium` or `complex`, or when `risk_tags` includes `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.

Simple low-risk requirements may skip a plan only when the requirement records `plan_required: false` and explains the reason.

## Capability Specs

<!-- workflow:capabilities:start -->
| ID | Title | Status | Introduced By |
| --- | --- | --- | --- |
<!-- workflow:capabilities:end -->

## Templates

| Template                                         | Purpose              |
| ------------------------------------------------ | -------------------- |
| [requirement.md](templates/requirement.md)       | 中文企业级需求工作单 |
| [plan.md](templates/plan.md)                     | 中文技术方案         |
| [implementation.md](templates/implementation.md) | 中文实施记录         |
| [capability.md](templates/capability.md)         | 中文能力规格         |

## External Skill Integrations

| Integration                                   | Purpose                                  |
| --------------------------------------------- | ---------------------------------------- |
| [superpowers.md](integrations/superpowers.md) | Superpowers Skill 的本项目产出物映射规则 |
| [trellis.md](integrations/trellis.md)         | Trellis 归档需求 Skill 的本项目适配规则  |

## Governance

| File                                                      | Purpose                        |
| --------------------------------------------------------- | ------------------------------ |
| [workflow-checklist.md](checks/workflow-checklist.md)     | 工作流一致性检查清单           |
| [requirement.schema.json](schema/requirement.schema.json) | Requirement frontmatter schema |
| [capability.schema.json](schema/capability.schema.json)   | Capability frontmatter schema  |
| [git.md](git.md)                                          | Git / PR 最小集成约定          |
