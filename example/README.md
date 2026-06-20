# 工作流使用示例

本目录用于说明人或 Agent 如何使用 `template/workflow/` 里的工作流模板。

注意：

- `template/workflow/` 是模板源码区，目标项目应按 `docs/usage.md` 组装成 `.workflow/`。
- `example/` 只是说明和演示，不要作为初始化内容复制。
- 本仓库根目录不再保留 `.workflow/`，避免把模板仓库自身历史误复制给业务项目。

## 推荐阅读顺序

1. [给人的使用指南](for-human/README.md)
2. [给 Agent 的使用指南](for-agent/README.md)
3. [样例需求链路](sample-requirement/README.md)

## 目标项目初始化

在目标项目根目录执行：

```bash
mkdir -p .workflow/templates .workflow/checks .workflow/schema .workflow/integrations
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/scaffold/ .workflow/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/document-templates/ .workflow/templates/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/checks/ .workflow/checks/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/schema/ .workflow/schema/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/integrations/ .workflow/integrations/
```

初始化后，目标项目会拥有自己的 `.workflow/`，然后从自己的 `REQ-0001` 开始记录需求。
