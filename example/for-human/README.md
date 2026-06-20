# 给人的使用指南

## 1. 初始化目标项目

在目标项目根目录执行：

```bash
mkdir -p .workflow/templates .workflow/checks .workflow/schema .workflow/integrations
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/scaffold/ .workflow/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/document-templates/ .workflow/templates/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/checks/ .workflow/checks/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/schema/ .workflow/schema/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/integrations/ .workflow/integrations/
```

不要复制本仓库根目录的其他文件，也不要把 `example/` 当成模板复制。

## 2. 填写项目地图

初始化后，先编辑：

```text
.workflow/project.md
```

补充目标项目的技术栈、模块边界、测试命令、部署约束和禁止修改的区域。

## 3. 创建第一个需求

使用模板：

```text
.workflow/templates/requirement.md
```

创建：

```text
.workflow/requirements/REQ-0001.md
```

如果需求复杂度是 `medium` 或 `complex`，或包含高风险标签，还要创建：

```text
.workflow/plans/REQ-0001-plan.md
```

实施完成后创建：

```text
.workflow/implementations/REQ-0001-implementation.md
```

## 4. 更新索引和入口

每次新建或推进需求后，更新：

```text
.workflow/index.md
.workflow/current.md
```

如果多个需求并行，使用：

```text
.workflow/active/REQ-0001.md
```

## 5. Git / PR 约定

查看：

```text
.workflow/git.md
```

最小规则：

- 分支名包含 `req-0001`。
- commit message 包含 `req-0001`。
- PR 描述链接 requirement、plan 和 implementation。
- CI 或本地验证结果写入 implementation。

## 6. 完成前检查

使用：

```text
.workflow/checks/workflow-checklist.md
```

确认需求、方案、实施记录、测试结果和索引一致。
