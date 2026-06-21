# AI Coding Workflow Toolkit

面向 Codex 和 Claude Code 的规格驱动开发工具包。它提供 CLI、项目级 Skills 和模板，把工作流治理放在 `.workflow/`，把业务文档放在 `docs/changes/` 与 `docs/specs/`。

GitHub Packages npm 包：`@jameswangxin/ai-coding-workflow-toolkit`

## 安装

需要 Node.js 20 或更高版本。在目标项目根目录执行：

```bash
printf "@jameswangxin:registry=https://npm.pkg.github.com\\n//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN\\n" >> ~/.npmrc
npm install -D @jameswangxin/ai-coding-workflow-toolkit --registry=https://npm.pkg.github.com
npx workflow-template
```

发布后也可直接运行：

```bash
npx --registry=https://npm.pkg.github.com @jameswangxin/ai-coding-workflow-toolkit
```

默认安装只补齐缺失的受管文件，不会覆盖已有变更包或规范。

## 文档结构

```text
.workflow/        工作流治理、模板、索引、当前入口、Skill 集成
docs/changes/    每个 REQ 的 proposal/design/tasks/implementation/verification
docs/specs/      已生效的领域行为规范
```

主状态流为：

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

中高复杂度、跨模块、数据、安全、迁移和外部接口相关的需求必须先有 `design.md` 和 `tasks.md`。扩展状态也必须记录在 proposal 的 `history` 中。

## 常用命令

```bash
# 检查安装状态
npx workflow-template --check

# 校验 docs/changes 的变更包、状态流、阶段产物和引用
npx workflow-template --validate

# 同步索引与当前工作入口
npx workflow-template --sync-index
npx workflow-template --sync-current REQ-0001

# 汇总某个需求的编排审计日志
npx workflow-template --audit-summary REQ-0001

# 只安装 Skills、只初始化模板，或安装 Claude Code Skills
npx workflow-template --skills-only
npx workflow-template --init-only
npx workflow-template --target claude --with-claude-md

# 卸载受管文件，必须显式确认
npx workflow-template --uninstall --yes
```

`--orchestrate REQ-xxxx` 是高级接口，需要目标 `.workflow/orchestration/` 自行提供 `skill-registry.yaml` 和 `execution-policies.yaml`。

编排审计日志记录的是工作流决策，不代表外部 Agent Runtime 已执行 Skill。日志会保存决策耗时、人工确认状态、Skill 来源路径和内容 hash；token、费用、真实工具调用和 Agent 运行耗时需要后续 Runtime Adapter 提供。

## 开发与发布前检查

```bash
npm ci
npm run check
npm test
npm run pack:check
```

GitHub Actions 会在 `main` 推送和 Pull Request 上运行相同的检查。发布内容只包含 `bin/`、`lib/`、`skills/` 和 `template/`；`prepublishOnly` 会在 `npm publish` 前再次运行语法检查和测试。

## 发布到 GitHub Packages

包通过 GitHub Packages 发布，发布名为 `@jameswangxin/ai-coding-workflow-toolkit`。推送版本 tag 会触发 `.github/workflows/publish-github-packages.yml`：

```bash
npm version patch
git push origin main
git push origin v0.1.1
```

本地安装需要具备 `read:packages` 权限的 GitHub token，并建议写入用户级 `~/.npmrc`，不要提交到仓库。工作流会执行 `npm ci`、`npm run check`、`npm test`，然后使用 `GITHUB_TOKEN` 发布到 `https://npm.pkg.github.com`。发布失败时先确认仓库 Settings → Actions → General 中 Workflow permissions 允许写入 packages。

更多目录说明见 [使用说明](docs/usage.md) 和 [架构说明](docs/architecture.md)。

## 许可证

[MIT](LICENSE)
