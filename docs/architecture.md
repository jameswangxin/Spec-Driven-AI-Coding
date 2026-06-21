# 模板架构说明

## 设计目标

本仓库是工作流模板源，不是某个业务项目的实例。模板源码需要清楚区分治理骨架、业务文档骨架、文档模板、校验规则和外部集成。

## 目录分层

```text
template/
  workflow/
    scaffold/             目标项目 .workflow 治理骨架
    document-templates/   变更包和领域规范模板
    governance/           schema 和检查清单
    integrations/         外部 Skill 适配规则
  docs/
    scaffold/             目标项目 docs 骨架
```

## `workflow/scaffold/`

目标项目 `.workflow/` 的治理骨架。

内容包括：

```text
index.md
current.md
project.md
playbook.md
git.md
active/
```

这些文件复制后成为目标项目的工作流入口和治理说明，不保存业务需求正文。

## `workflow/document-templates/`

创建变更包和规范时使用的模板。

内容包括：

```text
proposal.md
design.md
tasks.md
implementation.md
verification.md
spec.md
```

复制后进入目标项目：

```text
.workflow/templates/
```

## `docs/scaffold/`

目标项目业务文档骨架。

内容包括：

```text
changes/
  archive/
specs/
```

`docs/changes/` 保存每个 `REQ-xxxx-title` 的完整变更包；`docs/specs/` 保存当前生效的领域行为规范。

## `workflow/governance/`

治理和校验规则。

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

## `workflow/integrations/`

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
