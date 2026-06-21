# 项目地图

## 项目目标

本目录用于目标项目的规格驱动开发治理。业务文档真源不在 `.workflow/`，而在项目根目录的 `docs/changes/` 和 `docs/specs/`。

## 目录职责

```text
.workflow/
  index.md                 长期索引，链接到 docs/changes 与 docs/specs
  current.md               Agent 每次工作前的固定入口
  active/                  多需求并行时的独立工作入口
  project.md               项目地图
  playbook.md              流程手册
  templates/               proposal、design、tasks、implementation、verification、spec 模板
  integrations/            外部 Skill 和工具的适配规则
  schema/                  proposal frontmatter 校验规则
  checks/                  人工或 Agent 检查清单
  git.md                   Git / PR 最小集成约定

docs/
  changes/                 每个 REQ 的完整变更包
  changes/archive/         已归档变更包
  specs/                   当前生效的领域规范
```

## Agent 入口顺序

处理非平凡需求前，按顺序阅读：

1. `.workflow/project.md`
2. `.workflow/current.md`
3. `.workflow/playbook.md`
4. `.workflow/index.md`
5. 并行工作时的 `.workflow/active/REQ-xxxx.md`
6. 当前 `docs/changes/REQ-xxxx-title/proposal.md`
7. 当前 `design.md`、`tasks.md`、`implementation.md`、`verification.md`（如果存在）
8. 当前变更包下的 `specs/` 增量规范
9. `.workflow/git.md`
10. 涉及外部 Skill 时，读取 `.workflow/integrations/` 下的对应适配规则

## 状态流

主干状态流：

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

扩展状态流：

```text
draft|accepted|planned|implemented -> canceled
accepted|planned|implemented -> blocked
blocked -> accepted|planned|implemented
verified -> reopened
reopened -> planned|implemented|verified
draft|accepted|planned -> superseded
```

所有非主干状态变化必须写入 `proposal.md` 的 `history`，说明原因、影响和下一步。

## 规划规则

满足任一条件时必须先写 `design.md` 和 `tasks.md`：

- `complexity` 是 `medium` 或 `complex`。
- `risk_tags` 包含 `data`、`security`、`migration`、`external-api`、`architecture`、`cross-module`。

简单低风险需求可以跳过设计，但必须在 `proposal.md` 中写明：

```yaml
plan_required: false
plan_reason: "说明为什么可以跳过设计。"
```

## 记录原则

- 保留原始需求，不用 Agent 改写覆盖原话。
- 一个需求的所有业务产物集中在 `docs/changes/REQ-xxxx-title/`。
- `.workflow/` 只保存治理、索引、模板和入口，不保存业务正文。
- 技术设计说明取舍，不只列任务。
- 实施记录写实际发生的事情，不复制设计。
- 验证记录必须包含真实命令、结果和未覆盖风险。
- 影响长期系统行为的内容沉淀到 `docs/specs/`。
- Git 分支、commit 和 PR 必须能追溯到 `REQ-*`。

## 并行工作原则

- `current.md` 是默认入口，不是并行需求的唯一入口。
- 多个需求并行时，在 `.workflow/active/` 中为每个需求创建独立入口。
- active 入口只保存当前工作指针，不替代变更包。
- 需求归档后，可以删除 active 入口，历史仍保留在归档变更包中。

## Git / PR 原则

- 分支名包含 `req-0001` 这类需求编号。
- commit message 包含 `req-0001`。
- PR 描述链接 proposal、design、implementation 和 verification。
- CI 或本地验证结果写入 verification。

详细约定见 `.workflow/git.md`。
