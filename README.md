# AI Coding Workflow Toolkit

面向 Codex 和 Claude Code 的规格驱动开发工作流工具包。它提供一个 Node.js CLI、可安装的项目级 Skills，以及一套 `.workflow/` 模板，把需求、方案、实施记录、验证证据和可复用能力保存在目标仓库中。

npm 包：`@marsx/ai-coding-workflow-toolkit`

## 它解决什么问题

Agent 参与开发时，需求、设计、实现和验证很容易散落在聊天记录、临时文档和提交信息里。这个工具包把它们收敛到目标项目的 `.workflow/`，并用状态流和校验器约束推进顺序：

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

中高复杂度、跨模块、数据、安全、迁移和外部接口相关的需求必须先有方案。`blocked`、`canceled`、`reopened` 和 `superseded` 等扩展状态也必须写入需求的 `history`。

`.workflow/` 是项目真源。外部 Skills 可以提供方法和检查步骤，但需求、方案、实施与验证记录都回写到这里。

## 安装与初始化

需要 Node.js 20 或更高版本。

在目标项目根目录安装并初始化：

```bash
npm install -D @marsx/ai-coding-workflow-toolkit
npx workflow-template
```

也可以在发布包后直接运行：

```bash
npx @marsx/ai-coding-workflow-toolkit
```

默认安装只补齐缺失的受管文件，不会覆盖已有需求、方案或实施记录。安装器拒绝在用户主目录执行，也会拒绝 `.workflow`、`.codex`、`.codex/skills` 和 Claude 输出目录是符号链接的目标路径。

安装后会得到：

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
  checks/
  schema/
  integrations/

.codex/skills/
  workflow-new/
  workflow-confirm/
  workflow-plan/
  workflow-exec/
  workflow-check/
  workflow-archive/
```

## 常用命令

以下命令都在目标项目根目录执行。安装为开发依赖后使用 `npx workflow-template`；从源码运行时，替换为 `node /path/to/spec-driven-ai-coding/bin/workflow.js`。

```bash
# 查看安装是否完整；有缺失时以非零退出码结束
npx workflow-template --check

# 校验 .workflow 的 schema、状态流、计划、实施记录和引用
npx workflow-template --validate

# 重新生成 index 中由工具管理的表格
npx workflow-template --sync-index

# 同步当前工作入口；可指定需求编号
npx workflow-template --sync-current REQ-0001

# 断言需求处于允许状态，适合在 Skill 或自动化中使用
npx workflow-template --assert-status REQ-0001 --status planned

# 只安装 Skills 或只初始化 .workflow
npx workflow-template --skills-only
npx workflow-template --init-only

# 安装 Claude Code Skills，或同时安装 Codex 与 Claude Code Skills
npx workflow-template --target claude --with-claude-md
npx workflow-template --target all --with-claude-md

# 卸载受管模板和 workflow-* Skills，必须显式确认
npx workflow-template --uninstall --yes
```

`--target claude` 会把同一套工作流 Skills 安装到 `.claude/skills/`。`--with-claude-md` 只会在目标项目没有 `CLAUDE.md` 时创建最小入口，不会覆盖已有项目指令。

`--orchestrate REQ-xxxx` 是高级接口。它要求目标 `.workflow/orchestration/` 已提供 `skill-registry.yaml` 和 `execution-policies.yaml`，并会根据策略要求使用 `--confirm` 后才继续。默认模板目前不生成这两个配置文件，因此不要把它当作初始化后的默认入口。

## 使用项目级 Skills

安装后的 Skill 只读写 `.workflow/`，不会创建第二套需求文档目录。

| Skill | 用途 |
| --- | --- |
| `workflow-new` | 创建下一份需求工作单 |
| `workflow-confirm` | 澄清范围、规则和边界，并推进需求状态 |
| `workflow-plan` | 根据复杂度与风险创建技术方案，或记录跳过方案的理由 |
| `workflow-exec` | 按已确认范围实施，并记录实际验证结果 |
| `workflow-check` | 对照 schema、检查清单和验收标准复核记录 |
| `workflow-archive` | 归档已验证需求，同时保留历史 |

一个典型流程：

```text
/workflow-new 增加报表导出
/workflow-confirm REQ-0001
/workflow-plan REQ-0001
/workflow-exec REQ-0001
/workflow-check REQ-0001
/workflow-archive REQ-0001
```

## 安装模式与安全边界

`--skills-only` 只处理项目级 Skills，`--init-only` 只处理 `.workflow/` 模板。卸载仅移除安装器管理的模板和 `workflow-*` Skills，已有的 `.workflow/requirements/`、`plans/`、`implementations/`、`capabilities/` 记录，以及其他项目级 Skills 都会保留。

模板中的外部 Skill 适配规则位于：

- `.workflow/integrations/superpowers.md`
- `.workflow/integrations/trellis.md`

详细的目录职责和手动初始化方式见 [使用说明](docs/usage.md)，模板分层见 [架构说明](docs/architecture.md)。

## 本地开发与 CI

```bash
npm ci
npm run check
npm test
npm run pack:check
```

`npm run check` 对 CLI 和所有当前库文件执行 `node --check`。`npm test` 运行 Node 测试套件。`npm run pack:check` 会先执行 `prepack` 验证，再通过 `npm pack --dry-run` 检查发布 tarball 的内容。

GitHub Actions 会在 `main` 分支推送和所有 Pull Request 上依次执行 `npm ci`、`npm run check`、`npm test` 与 `npm run pack:check`。

## npm 发布前检查

包的发布内容由 `package.json` 的 `files` 白名单控制，只包含 `bin/`、`lib/`、`skills/` 和 `template/`，避免把测试、示例和仓库内部文档带入 tarball。

发布前运行：

```bash
npm run pack:check
```

`prepublishOnly` 会在 `npm publish` 前再次运行语法检查和测试。发布命令本身不在 CI 中执行。

## 许可证

包元数据声明为 MIT。发布前应在仓库根目录补充包含正确版权信息的 `LICENSE` 文件。
