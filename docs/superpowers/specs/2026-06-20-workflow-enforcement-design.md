# 工作流规则可执行化设计

## 目标

将 Spec-Driven AI Coding 工作流中依赖 Agent 自觉的关键约定变成可执行、可验证的本地工具能力：校验记录、门控状态、同步索引，并让仓库自身使用该工作流。

## 范围

本期包括：

- Requirement 与 Capability frontmatter 校验、状态机校验和跨记录引用校验。
- `workflow-template --validate`、`--sync-index`、`--sync-current` CLI 命令。
- `workflow-check` 与 `workflow-exec` Skill 接入校验和状态门控。
- 模板仓库 dogfooding：根 `CLAUDE.md` 与本次需求、方案、实施记录。
- CLI、安装器和校验器的自动化测试。

本期不包括 Git Hook/CI、模板迁移、跨需求依赖图、Codex/Claude Skill 目录拆分。

## 架构

### 校验器

新增 `lib/validator.js`，只使用 Node.js 标准库。该模块解析受控 Markdown 文件顶部的 YAML frontmatter，并返回统一的诊断对象：`code`、`path`、`message`、`severity`。

校验器执行以下规则：

1. Requirement、Capability 的必填字段、标识符、枚举值与日期格式符合已安装 schema 的既有约束。
2. `REQ-xxxx.md` 与 requirement `id`、`CAP-xxxx.md` 与 capability `id` 一致。
3. Requirement history 的每一次 `from -> to` 转换属于 index 中定义的状态流，history 末项状态等于当前 `status`。
4. `updated_at` 不早于 history 中最新日期。
5. Requirement 的每个 `capabilities` ID 都存在；被引用的 capability 不得是 `deprecated`。
6. 由同步器生成的 index/current 内容与文件系统中的当前记录一致。

`assertStatus(workflowRoot, reqId, allowedStatuses)` 复用同一读取逻辑，在不存在需求或当前状态不允许时抛出带稳定错误码的错误。

### Frontmatter 格式

模板中的 frontmatter 是受限 YAML，而不是任意 YAML：字符串、布尔值、`null`、数组、对象、缩进列表。解析器只支持模板和生成记录所需的此子集，遇到不支持或不完整格式时产生明确的校验错误，不执行外部代码。

### CLI

CLI 改用 `util.parseArgs` 解析参数，默认输出人类可读结果。新增：

- `--validate`：运行完整工作流校验；任一 error 时退出码为 1。
- `--sync-index`：基于记录文件重建 `index.md` 的受管理区块。
- `--sync-current [REQ-xxxx]`：指定需求时写入它；省略 ID 时只在存在唯一活动需求时自动选择。
- `--format human|json`：控制 `--check` 与 `--validate` 输出。

任一会改变工作流记录的同步命令仅在 `.workflow/` 已存在时执行。同步器保留模板静态说明，仅替换显式的自动管理区块，保证人工说明不会被覆盖。

### Skills

- `workflow-check` 先调用 `workflow-template --validate`；失败时不得宣称检查通过。
- `workflow-exec` 在任何实现操作前调用状态门控，允许的需求状态为 `accepted` 或 `planned`，并继续要求用户的明确实施授权。

### Dogfooding

仓库根安装 `.workflow/` 并添加 `CLAUDE.md`。本期改造创建一条真实 Requirement；由于它涵盖 CLI、模板、Skills 和测试，必须有 Plan 与 Implementation 记录。状态推进、验证命令和结果写入 Implementation。

## 错误处理

所有可预期错误有稳定代码，例如：

- `WF_FRONTMATTER_INVALID`
- `WF_REQ_SCHEMA_INVALID`
- `WF_STATUS_TRANSITION_INVALID`
- `WF_CAPABILITY_MISSING`
- `WF_CAPABILITY_DEPRECATED`
- `WF_CURRENT_AMBIGUOUS`

人类模式逐条显示路径、代码与原因；JSON 模式输出可供 CI 消费的诊断列表。

## 测试与验收

测试从失败用例开始，覆盖：frontmatter 解析、Requirement/Capability 规则、状态转换、日期、CAP 引用、索引和 current 同步、CLI 解析与输出，以及 Claude / `all` 的安装卸载路径。

验收条件：

1. 无效工作流运行 `--validate` 必须失败并提供可定位诊断。
2. 有效的模板工作流运行 `--validate` 必须成功。
3. `--sync-index` 与 `--sync-current` 在重复执行后保持相同结果。
4. `workflow-exec` 不能在 draft、implemented 等不允许状态下开始实施。
5. `npm test` 通过。
