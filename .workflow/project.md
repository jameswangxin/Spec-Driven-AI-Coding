# 项目地图

## 项目目标

本目录用于目标项目的企业级规格驱动开发。目标不是替代代码仓库本身，而是为需求、方案、实施、验证和能力沉淀提供稳定上下文。

## 工作流目录职责

```text
.workflow/
  index.md                 长期索引，记录需求、状态、能力和入口说明
  current.md               Agent 每次工作前的固定入口
  active/                  多需求并行时的独立工作入口
  project.md               项目地图，记录长期稳定的项目约定
  playbook.md              流程手册，记录每类动作如何执行
  requirements/            需求工作单
  plans/                   技术方案
  implementations/         实施记录
  capabilities/            可复用能力规格
  templates/               新建文档时使用的模板
  integrations/            外部 Skill 和工具的本项目适配规则
  schema/                  frontmatter 结构校验规则
  checks/                  人工或 Agent 检查清单
  git.md                   Git / PR 最小集成约定
```

## Agent 入口顺序

处理非平凡需求前，按顺序阅读：

1. `.workflow/project.md`
2. `.workflow/current.md`
3. `.workflow/index.md`
4. 当前 `REQ-*` 需求文件
5. 当前 `REQ-*` 技术方案
6. 当前 `REQ-*` 实施记录
7. 需求引用的 `CAP-*` 能力规格
8. 涉及外部 Skill 时，读取 `.workflow/integrations/` 下的对应适配规则

并行需求场景下，先读取 `.workflow/active/REQ-xxxx.md`，再按其中列出的上下文继续。

## 需求状态

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

| 状态 | 含义 |
| --- | --- |
| draft | 需求仍在整理，不能开始实施 |
| accepted | 需求意图和边界已经清楚，可以进入方案阶段 |
| planned | 技术方案已存在，或明确记录可以跳过方案 |
| implemented | 改动已完成，实施记录已写入 |
| verified | 测试或替代验证已完成，并记录结果 |
| archived | 需求关闭，保留历史记录 |
| blocked | 需求暂时无法推进，等待外部输入或依赖解除 |
| canceled | 需求取消，保留历史和取消原因 |
| reopened | 已验证需求重新打开，需要补充处理 |
| superseded | 需求被后续需求替代 |

所有非主干状态变化必须写入 `history`，说明原因、影响和下一步。

## 规划规则

满足任一条件时必须先写技术方案：

- `complexity` 是 `medium` 或 `complex`。
- `risk_tags` 包含 `data`、`security`、`migration`、`external-api`、`architecture`、`cross-module`。

简单低风险需求可以跳过方案，但必须在需求文件中写明：

```yaml
plan_required: false
plan_reason: "说明为什么可以跳过方案。"
```

## 企业级记录原则

- 保留原始需求，不用 Agent 改写覆盖原话。
- 先澄清术语、业务规则、边界条件，再写技术方案。
- 技术方案说明取舍，不只列任务。
- 实施记录写实际发生的事情，不复制方案。
- 测试记录必须包含真实命令、结果和未覆盖风险。
- 能复用的系统能力沉淀为 `CAP-*`，不要只留在聊天上下文里。
- 外部 Skill 只提供方法论，`.workflow/` 决定文档真源和状态流。
- Git 分支、commit 和 PR 必须能追溯到 `REQ-*`。

## 并行工作原则

- `current.md` 是默认入口，不是并行需求的唯一入口。
- 多个需求并行时，在 `.workflow/active/` 中为每个需求创建独立入口。
- active 入口只保存当前工作指针，不替代 requirement、plan 或 implementation。
- 需求合并或归档后，可以删除 active 入口，历史仍保留在 `REQ-*` 文件中。

## Git / PR 原则

- 分支名包含 `req-0001` 这类需求编号。
- commit message 包含 `req-0001`。
- PR 描述链接 requirement、plan 和 implementation。
- CI 或本地验证结果写入 implementation。

详细约定见 `.workflow/git.md`。
