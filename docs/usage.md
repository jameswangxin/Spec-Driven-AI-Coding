# 使用说明

## 这个仓库是什么

本仓库是企业级规格驱动开发的工作流模板源。模板源码按职责放在 `template/` 下：

```text
template/
  workflow/
    scaffold/             目标项目 `.workflow/` 的运行骨架
    document-templates/   需求、方案、实施记录、能力规格模板
    governance/           schema 和检查清单
    integrations/         外部 Skill 适配规则
```

目标项目应该按分层规则组装自己的 `.workflow/`。不要复制本仓库根目录，也不要复制 `example/`。

## 初始化目标项目

在目标项目根目录执行：

```bash
mkdir -p .workflow/templates .workflow/checks .workflow/schema .workflow/integrations
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/scaffold/ .workflow/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/document-templates/ .workflow/templates/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/checks/ .workflow/checks/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/schema/ .workflow/schema/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/integrations/ .workflow/integrations/
```

复制后，目标项目会得到：

```text
.workflow/
  index.md
  current.md
  project.md
  playbook.md
  git.md
  active/
  requirements/
  plans/
  implementations/
  capabilities/
  templates/
  integrations/
  schema/
  checks/
```

## 创建第一个需求

初始化后，目标项目应创建自己的 `REQ-0001`：

```text
.workflow/requirements/REQ-0001.md
.workflow/plans/REQ-0001-plan.md
.workflow/implementations/REQ-0001-implementation.md
```

使用模板：

- `.workflow/templates/requirement.md`
- `.workflow/templates/plan.md`
- `.workflow/templates/implementation.md`
- `.workflow/templates/capability.md`

## 外部 Skill

模板包含外部 Skill 适配规则：

- `.workflow/integrations/superpowers.md`
- `.workflow/integrations/trellis.md`

原则：

```text
外部 Skill 提供方法论；
.workflow/ 决定真源、格式、状态和归档规则。
```

## 推荐使用顺序

1. 按上面的命令组装目标项目 `.workflow/`。
2. 编辑 `.workflow/project.md`，补充目标项目技术栈、模块和约束。
3. 创建 `REQ-0001`。
4. 如需方案，创建 `REQ-0001-plan.md`。
5. 实施后创建或更新 `REQ-0001-implementation.md`。
6. 运行验证命令，并把结果写入实施记录。
7. 更新 `.workflow/index.md` 和 `.workflow/current.md`。

## 并行需求

单需求工作可以使用 `.workflow/current.md`。多个需求并行时，不要反复覆盖 `current.md`，应创建：

```text
.workflow/active/REQ-0001.md
```

active 文件只保存当前工作入口，不替代 requirement、plan 或 implementation。

## Git / PR

模板包含最小 Git / PR 约定：

- `.workflow/git.md`

建议分支、commit 和 PR 都引用 `REQ-*`，并将 CI 或本地验证结果写回 implementation。
