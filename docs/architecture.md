# 模板架构说明

## 设计目标

本仓库是工作流模板源，不是某个业务项目的 `.workflow/` 实例。模板源码需要清楚区分不同职责，避免后续维护者把运行时骨架、文档模板、治理规则和外部集成混在一起。

## 目录分层

```text
template/
  workflow/
    scaffold/
    document-templates/
    governance/
    integrations/
```

## `scaffold/`

目标项目 `.workflow/` 的运行骨架。

内容包括：

```text
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
```

这些文件复制后直接成为目标项目 `.workflow/` 的基础结构。

## `document-templates/`

创建工作流记录时使用的文档模板。

内容包括：

```text
requirement.md
plan.md
implementation.md
capability.md
```

复制后进入目标项目：

```text
.workflow/templates/
```

## `governance/`

企业化治理和校验规则。

内容包括：

```text
checks/
schema/
```

复制后进入目标项目：

```text
.workflow/checks/
.workflow/schema/
```

## `integrations/`

外部 Skill 和工具的适配规则。

内容包括：

```text
superpowers.md
trellis.md
```

复制后进入目标项目：

```text
.workflow/integrations/
```

详细命令见 [使用说明](usage.md)。
