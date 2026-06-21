# AI Coding Workflow Toolkit

面向 Codex 和 Claude Code 的规格驱动开发工具包。它提供 CLI、项目级 Skills 和 `.workflow/` 模板，把需求、方案、实施记录与验证证据保存在目标仓库中。

npm 包：`@marsx/ai-coding-workflow-toolkit`

## 安装

需要 Node.js 20 或更高版本。在目标项目根目录执行：

```bash
npm install -D @marsx/ai-coding-workflow-toolkit
npx workflow-template
```

发布后也可直接运行：

```bash
npx @marsx/ai-coding-workflow-toolkit
```

默认安装只补齐缺失的受管文件，不会覆盖已有需求、方案或实施记录。

## 工作流

`.workflow/` 是项目真源，主状态流为：

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

安装后可用以下 Skills 推进工作：

```text
/workflow-new 增加报表导出
/workflow-confirm REQ-0001
/workflow-plan REQ-0001
/workflow-exec REQ-0001
/workflow-check REQ-0001
/workflow-archive REQ-0001
```

中高复杂度、跨模块、数据、安全、迁移和外部接口相关的需求必须先有方案。`blocked`、`canceled`、`reopened` 和 `superseded` 等扩展状态也必须记录在需求的 `history` 中。

## 常用命令

```bash
# 检查安装状态
npx workflow-template --check

# 校验 .workflow 的 schema、状态流、计划、实施记录和引用
npx workflow-template --validate

# 同步索引与当前工作入口
npx workflow-template --sync-index
npx workflow-template --sync-current REQ-0001

# 只安装 Skills、只初始化模板，或安装 Claude Code Skills
npx workflow-template --skills-only
npx workflow-template --init-only
npx workflow-template --target claude --with-claude-md

# 卸载受管文件，必须显式确认
npx workflow-template --uninstall --yes
```

`--orchestrate REQ-xxxx` 是高级接口，需要目标 `.workflow/orchestration/` 自行提供 `skill-registry.yaml` 和 `execution-policies.yaml`。

## 开发与发布前检查

```bash
npm ci
npm run check
npm test
npm run pack:check
```

GitHub Actions 会在 `main` 推送和 Pull Request 上运行相同的检查。发布内容只包含 `bin/`、`lib/`、`skills/` 和 `template/`；`prepublishOnly` 会在 `npm publish` 前再次运行语法检查和测试。

更多目录说明见 [使用说明](docs/usage.md) 和 [架构说明](docs/architecture.md)。

## 许可证

[MIT](LICENSE)
