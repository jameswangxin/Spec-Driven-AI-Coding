# Spec-Driven AI Coding

面向 Codex 的规格驱动开发工作流模板。它把需求、方案、实施记录、验证证据和可复用能力留在仓库里，让每次改动都能追溯到具体的 `REQ-*`。

项目提供两部分内容：

- 一套 `.workflow/` 模板，定义需求状态、文档结构、校验规则和 Git/PR 约定。
- 一个零依赖 Node.js 安装器，负责把模板和项目级 Codex Skills 安装到目标仓库。

## 适用场景

适合需要持续迭代、多人协作或由 Agent 参与开发的项目。简单改动也可以直接处理；中高复杂度、跨模块、数据、安全、迁移和外部接口相关的改动，会要求先把需求与方案写清楚。

`.workflow/` 是唯一真源。外部 Skills 可以提供方法和检查步骤，但需求、方案、实施与验证记录都回写到 `.workflow/`。

## 快速开始

需要 Node.js 20 或更高版本。在目标项目根目录运行：

```bash
node /path/to/spec-driven-ai-coding/bin/workflow.js
```

这会创建缺失的 `.workflow/` 文件，并安装六个项目级 Skills 到 `.codex/skills/`。默认安装只补齐缺失内容，不会覆盖已有需求、方案或实施记录。

检查安装状态：

```bash
node /path/to/spec-driven-ai-coding/bin/workflow.js --check
```

如果检查发现缺失文件，命令会返回非零退出码，适合接入 CI 或安装后的自检。

## Codex 工作流入口

安装完成后，可以在 Codex 中使用这些入口：

| Skill | 用途 |
| --- | --- |
| `workflow-new` | 创建下一个需求工作单 |
| `workflow-confirm` | 澄清范围、规则和边界，并推进需求状态 |
| `workflow-plan` | 根据复杂度与风险创建技术方案 |
| `workflow-exec` | 按已确认范围实施，并记录实际验证结果 |
| `workflow-check` | 按 schema 和检查清单复核当前记录 |
| `workflow-archive` | 将已验证需求归档，保留历史 |

```text
/workflow-new 增加报表导出
/workflow-confirm REQ-0001
/workflow-plan REQ-0001
/workflow-exec REQ-0001
```

主状态流如下：

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

`blocked`、`canceled`、`reopened` 和 `superseded` 等扩展状态也受工作流约束，变更原因必须写入需求的 `history`。

## 安装模式

```bash
# 只安装或更新 Codex Skills
node /path/to/spec-driven-ai-coding/bin/workflow.js --skills-only

# 只初始化 .workflow/ 模板
node /path/to/spec-driven-ai-coding/bin/workflow.js --init-only

# 卸载受管模板和 workflow-* Skills，必须显式确认
node /path/to/spec-driven-ai-coding/bin/workflow.js --uninstall --yes
```

卸载只移除安装器管理的模板文件和 `workflow-*` Skills。已有的 `.workflow/requirements/`、`plans/`、`implementations/`、`capabilities/` 记录，以及其他项目级 Skills 都会保留。

安装器拒绝在用户主目录执行，也会拒绝 `.workflow`、`.codex` 或 `.codex/skills` 是符号链接的目标路径，避免误写到项目外。

## 目录结构

```text
template/workflow/
  scaffold/               .workflow 的基础入口和流程手册
  document-templates/     REQ、plan、implementation、CAP 模板
  governance/             schema 和工作流检查清单
  integrations/           Superpowers、Trellis 等外部 Skill 的映射规则

skills/
  workflow-*/             安装到目标项目 .codex/skills/ 的项目级 Skills

bin/workflow.js           命令行入口
lib/installer.js          安装、检查与安全卸载逻辑
test/installer.test.js    安装器和 CLI 测试
```

目标项目安装后会得到：

```text
.workflow/
  requirements/           需求工作单
  plans/                  技术方案
  implementations/        实施与验证记录
  capabilities/           可复用能力规格
  templates/              新建文档的模板
  checks/                 工作流检查清单
  schema/                 frontmatter schema
  integrations/           外部 Skill 适配规则
```

更完整的目录职责和初始化方式见 [docs/usage.md](docs/usage.md)，模板架构见 [docs/architecture.md](docs/architecture.md)。

## 开发与验证

```bash
npm test
node --check bin/workflow.js
node --check lib/installer.js
```

测试覆盖安装、默认保留、显式覆盖、不同安装模式、只读检查、安全卸载、主目录和符号链接保护，以及 CLI 参数行为。

## 许可证

本项目采用 [MIT License](LICENSE)。
