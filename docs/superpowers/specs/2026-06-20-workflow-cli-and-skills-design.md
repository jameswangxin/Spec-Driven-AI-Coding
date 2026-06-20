# 工作流安装器与 Codex Skills 设计

## 目标

将本仓库现有的 `.workflow/` 模板转化为可安装、可触发和可校验的项目级工作流，同时保持 `.workflow/` 为唯一真源。

## 不在范围内

- 不引入 `docs/specpilot/`、`REQ-xxx-draft.md` 或第二套状态体系。
- 不修改 `.workflow/` 的文档协议、模板字段或状态流。
- 不增加运行时依赖、远程服务、插件市场配置或全局配置写入。
- 不实施自动提交、自动归档或自动修改业务代码的行为。

## 方案选择

采用零依赖 Node.js CLI 和项目级 Codex Skills。

CLI 将从本仓库的 `template/workflow/` 安装目标项目的 `.workflow/`，并将仓库的 `skills/workflow-*/` 复制到目标项目 `.codex/skills/`。CLI 提供安装、仅安装 Skills、仅初始化工作流、检查和卸载操作。默认保留既有 `.workflow/` 内容；仅在显式 `--yes` 时覆盖模板同名文件。它拒绝在用户主目录运行，避免误写全局目录。

Skills 仅编排既有 `.workflow/` 协议：创建和确认需求、创建方案、记录实施与验证、检查一致性、归档需求。它们不会创建平行文档目录；所有结果分别写入 `requirements/`、`plans/`、`implementations/`、`capabilities/`、`index.md` 与 `current.md`。

## 文件边界

| 文件 | 职责 |
| --- | --- |
| `package.json` | 声明 Node CLI 的包元数据和内建测试命令。 |
| `bin/workflow.js` | 安装、检查和卸载目标项目的模板及 Skills。 |
| `lib/installer.js` | 文件复制、保护、检查和卸载的纯逻辑，供 CLI 与测试复用。 |
| `skills/workflow-*/SKILL.md` | Codex 入口及 `.workflow/` 产出规则。 |
| `test/installer.test.js` | 覆盖安装、保留已有文件、覆盖、检查、卸载和主目录保护。 |
| `docs/usage.md` | 增加安装、命令和升级说明。 |

## CLI 契约

```text
node bin/workflow.js
node bin/workflow.js --skills-only
node bin/workflow.js --init-only
node bin/workflow.js --check
node bin/workflow.js --uninstall
node bin/workflow.js --yes
```

安装目标为当前工作目录，且必须是用户项目目录。`--check` 不写文件；`--uninstall` 只删除由本工具识别的 `.workflow/` 和 `workflow-*` 项目级 Skills，不触及业务代码或全局配置。

## Skill 契约

| Skill | 工作流动作 | 真源落点 |
| --- | --- | --- |
| `workflow-new` | 生成下一个需求工作单并更新索引/入口 | `requirements/REQ-xxxx.md` |
| `workflow-confirm` | 澄清、确认边界和状态更新 | 当前 `REQ-*` |
| `workflow-plan` | 在需要时写技术方案并更新状态 | `plans/REQ-xxxx-plan.md` |
| `workflow-exec` | 按已确认范围实施并写实施记录 | `implementations/REQ-xxxx-implementation.md` |
| `workflow-check` | 根据 checklist 和 schema 复核记录 | 只读；问题写回相应记录时须明确说明 |
| `workflow-archive` | 在 verified 后归档，并保留历史 | 当前 `REQ-*`、`index.md` |

`workflow-exec` 不绕过测试。实施完成前必须运行相关验证命令，记录实际输出或无法运行的原因、替代验证和残余风险。

## 数据流与安全

```text
仓库 template/workflow + skills/workflow-*
  -> Node CLI（当前项目根目录）
  -> 目标项目 .workflow/ + .codex/skills/workflow-*
  -> Codex Skill
  -> .workflow 内既定的 REQ / plan / implementation / CAP 记录
```

CLI 仅复制或删除固定前缀和固定目录。所有路径均以目标项目根目录解析并验证，防止路径逃逸。默认安装不覆盖已有 `.workflow/`；`--yes` 是唯一的覆盖开关。

## 测试策略

- Node 内建 `node:test` 在临时目录中验证各 CLI 文件操作。
- 首先编写会失败的安装器测试；实现后确认测试通过。
- 覆盖：完整安装、默认保留、显式覆盖、单独模式、只读检查、选择性卸载和主目录拒绝。
- 使用 `node --check` 校验 CLI 语法，并运行全部测试作为交付验证。

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 覆盖用户工作流记录 | 默认不覆盖；只有 `--yes` 可以替换模板。 |
| 卸载误删用户 Skill | 只处理名称为 `workflow-*` 且包含 `SKILL.md` 的目录。 |
| Skills 与模板协议漂移 | Skills 明确引用 `project.md`、`playbook.md` 和既有模板；测试检查安装内容。 |
| Node 版本不兼容 | 只使用 Node 标准库，并在包元数据声明最低版本。 |

## 自检

- 没有未决占位符或第二套文档真源。
- CLI、Skills、测试和文档各有明确职责。
- 所有状态变化仍遵循 `.workflow/project.md` 的状态机。
- 安装和卸载均限制在当前项目目录内。
