# REQ-0002 技术方案

## 1. 目标

让 workflow Skills 从「用户手动选择」升级为「可审计的半自动编排」：

1. 通过 Skill Registry 统一管理可用 Skills 的契约与触发条件。
2. 通过轻量编排引擎，根据 `.workflow/current.md` 和 REQ/plan 推荐下一步 Skill。
3. 通过审计日志，让每一次编排调用都可追溯、可复盘。
4. 保持人工对高风险操作的最终控制权。
5. 将编排注册表与项目自身的 workflow skills 对齐，并新增 `workflow-brainstorm` 用于需求探索。

## 2. 非目标

- 不做自然语言自动路由（不模仿 Superpowers 的全自动触发）。
- 不做完整 DAG 工作流引擎。
- 不修改现有 Skill 安装机制或文件格式。
- 不改动 REQ-0001 的 validator 核心逻辑。

## 3. 改动范围

### 文件 / 模块

- `bin/workflow.js`：新增 `--orchestrate <req-id>` 命令。
- `lib/orchestrator.js`：编排引擎核心。
- `.workflow/orchestration/skill-registry.yaml`：Skill 注册表，使用项目 workflow skills。
- `.workflow/orchestration/execution-policies.yaml`：执行策略，所有 workflow skills 需人工确认。
- `skills/workflow-brainstorm/SKILL.md`（新建）：基于 Superpowers 头脑风暴适配规则的需求探索 Skill。
- `.workflow/audit/executions/`：审计日志目录。
- `test/orchestrator.test.js`：编排与审计测试，覆盖新状态映射和技能。
- `example/req-0002-orchestration/REQ-0002-plan.md`：更新为最终设计。

### 行为变化

- 新增 `workflow-template --orchestrate REQ-xxxx` 命令。
- 编排器读取 current.md、REQ、plan，按状态推荐 workflow 技能：
  - `draft` -> `workflow-confirm`
  - `accepted` -> `workflow-plan`
  - `planned` -> `workflow-exec`
  - `implemented` -> `workflow-check`
  - `verified` -> `workflow-archive`
  - `archived` -> 建议压缩或开启新会话（不执行技能）
  - `canceled` / `superseded` / `blocked` -> 无操作
- 根据 `execution-policies.yaml`，所有 `workflow-*` 技能默认需要人工确认（`auto_execute: false`, `human_confirm: true`）。
- 每次编排生成审计日志。

### 影响对象

- 用户：减少手动选择 Skill 的成本，同时保留控制权。
- 系统：新增编排层，但复用 REQ-0001 的校验能力。
- 运维 / 数据：审计日志可用于成本与合规分析。

## 4. 方案设计

### 4.1 Skill Registry

`.workflow/orchestration/skill-registry.yaml`：

```yaml
skills:
  - id: workflow-brainstorm
    name: Workflow Brainstorm
    description: Explore and clarify a new idea before it becomes a formal requirement
    side_effects: [writes_file]
    safety_level: write-workflow-only
    triggers:
      - intent: brainstorm
        keywords: ["探索", "头脑风暴", "想法"]

  - id: workflow-new
    name: Workflow New
    description: Create a new requirement work item
    ...

  - id: workflow-confirm
    name: Workflow Confirm
    description: Confirm a draft requirement before planning
    ...

  - id: workflow-plan
    name: Workflow Plan
    description: Create a technical plan for an accepted requirement
    ...

  - id: workflow-exec
    name: Workflow Execute
    description: Execute a planned requirement
    ...

  - id: workflow-check
    name: Workflow Check
    description: Verify an implemented requirement
    ...

  - id: workflow-archive
    name: Workflow Archive
    description: Archive a verified requirement
    ...
```

### 4.2 Execution Policies

`.workflow/orchestration/execution-policies.yaml`：

```yaml
policies:
  - skill: "*"
    auto_execute: false
    human_confirm: true
    audit_level: standard

  - skill: "workflow-*"
    auto_execute: false
    human_confirm: true
    audit_level: detailed
```

所有 `workflow-*` 技能需要人工确认，并记录详细审计日志。

### 4.3 Orchestrator Core

`lib/orchestrator.js` 职责：

1. 读取 `.workflow/current.md` 和指定 REQ/plan。
2. 根据当前需求状态推断下一步（`inferNextStep`）。
3. 查询 skill-registry，匹配最合适的 Skill。
4. 查询 execution-policies，决定自动执行或暂停确认。
5. 调用 Skill（通过生成对应 Skill 的调用上下文或提示）。
6. 记录审计日志。

状态映射：

| 状态                            | 推荐 Skill       | 说明                 |
| ------------------------------- | ---------------- | -------------------- |
| draft                           | workflow-confirm | 确认和澄清需求       |
| accepted                        | workflow-plan    | 创建或完善技术方案   |
| planned                         | workflow-exec    | 执行方案             |
| implemented                     | workflow-check   | 验证和检查           |
| verified                        | workflow-archive | 归档关闭             |
| archived                        | null             | 建议压缩或开启新会话 |
| canceled / superseded / blocked | null             | 无操作               |

### 4.4 Audit Log

`.workflow/audit/executions/exec-<timestamp>.yaml`：

```yaml
execution_id: exec-20260621-001
requirement: requirements/REQ-0002.md
plan: plans/REQ-0002-plan.md
trigger:
  type: explicit_command
  input: "--orchestrate REQ-0002"
status: completed
steps:
  - step: 1
    skill: workflow-plan
    status: completed
    auto_executed: false
    human_confirmed: true
    input_summary: ...
    output_summary: ...
    side_effects: [writes_file]
    timestamps:
      started: "2026-06-21T10:00:00Z"
      completed: "2026-06-21T10:05:00Z"
```

## 5. 数据流 / 调用链路

```text
用户: workflow-template --orchestrate REQ-0002
  -> CLI 解析参数
  -> orchestrator.loadContext('REQ-0002')
  -> 读取 current.md、REQ-0002.md、plan
  -> orchestrator.inferNextStep()
  -> 匹配 Skill Registry
  -> 检查 Execution Policy
  -> 所有 workflow-* 技能：暂停，请求用户确认
  -> Skill 执行（内部使用 --assert-status 和 --validate）
  -> 更新 implementation
  -> 写入 audit log
```

## 6. 接口 / 数据结构变化

### 新增

- CLI 选项 `--orchestrate <req-id>`
- `lib/orchestrator.js`
- `.workflow/orchestration/skill-registry.yaml`
- `.workflow/orchestration/execution-policies.yaml`
- `.workflow/audit/executions/`
- `skills/workflow-brainstorm/SKILL.md`

### 修改

- `test/orchestrator.test.js`：更新 fixture、断言和状态映射测试。
- `example/req-0002-orchestration/REQ-0002-plan.md`：反映最终设计。

### 删除

- 无。

## 7. 兼容性与迁移

- 兼容性影响：CLI 新增命令，旧命令不受影响。
- 数据迁移：无。
- 配置变更：无（编排文件新建，不影响已有项目）。

## 8. 风险与回滚

| 风险                    | 影响                         | 缓解方式                                       |
| ----------------------- | ---------------------------- | ---------------------------------------------- |
| 编排器推荐错误 Skill    | 用户执行了不想要的操作       | 所有 workflow 技能必须人工确认；推荐不等于执行 |
| 审计日志过多            | 仓库膨胀                     | 日志使用结构化 YAML，可定期归档                |
| Skill Registry 维护成本 | 新增 Skill 需要更新 registry | 提供 schema 和校验，纳入代码审查               |

回滚方式：

- 删除 `lib/orchestrator.js` 和 CLI 新增分支。
- 删除 `.workflow/orchestration/` 和 `.workflow/audit/`（如不需要）。
- 还原测试文件。
- 删除 `skills/workflow-brainstorm/`。

## 9. 测试策略

### 自动化测试

- `test/orchestrator.test.js`：
  - `--orchestrate` 命令解析成功。
  - 编排器能正确读取上下文。
  - 根据 policy 决定自动执行或暂停确认。
  - 审计日志格式正确。
  - 状态映射测试覆盖所有 workflow skills。
  - `archived` 状态返回压缩建议。
  - 终端状态（canceled/superseded/blocked）返回 null。

### 手工验证

- 在 example 目录下运行 `node bin/workflow.js --orchestrate REQ-0002`（示例模式）。
- 验证推荐 Skill 和确认流程。
- 运行 `node bin/workflow.js --validate` 确保 schema 通过。

### 不覆盖项与原因

- 不测试 Claude Code Agent 是否 100% 遵守 Skill 提示（这是执行层行为）。
- 不测试自然语言路由（MVP 范围外）。

## 10. 实施步骤

1. 更新 `test/orchestrator.test.js` 以反映新设计（RED）。
2. 更新 `lib/orchestrator.js` 的 `inferNextStep` 和 `resolvePolicy`（GREEN）。
3. 更新 `.workflow/orchestration/skill-registry.yaml` 为 workflow skills。
4. 更新 `.workflow/orchestration/execution-policies.yaml` 为 workflow-\* 策略。
5. 创建 `skills/workflow-brainstorm/SKILL.md`。
6. 更新 `example/req-0002-orchestration/REQ-0002-plan.md`。
7. 运行 `npm test` 并修复问题。
8. 运行 `node bin/workflow.js --validate` 验证。
9. 更新 `example/req-0002-orchestration/REQ-0002-implementation.md` 并记录验证结果。
