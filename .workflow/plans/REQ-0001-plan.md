# REQ-0001 技术方案

## 1. 目标

让安装的 workflow Skills（`workflow-new`、`workflow-confirm`、`workflow-plan`、`workflow-exec`、`workflow-check`、`workflow-archive`）从“依赖 Agent 自律的 Markdown 说明书”升级为“包含可执行约束的 Skill 提示”。完成后：

1. CLI 暴露 `assertStatus` 能力（`--assert-status`）。
2. 每个 Skill 被调用时必须先读取 `.workflow/current.md`、目标 `REQ-*`、plan/implementation。
3. 每个 Skill 修改 `.workflow/` 文件后必须运行 `workflow-template --validate`。
4. 状态推进类 Skill 在变更前必须调用 `--assert-status` 验证前置状态。
5. 新增 CLI 与 Skill 指令的测试覆盖。

## 2. 非目标

- 不改变 Skill 的安装路径或文件格式。
- 不引入 Claude Code 的 hooks、settings 自动化或新的 Agent harness 配置。
- 不重构 validator 核心校验逻辑，仅暴露已有能力。

## 3. 改动范围

### 文件 / 模块

- `bin/workflow.js`：新增 `--assert-status` 命令与 `--status` 多值选项。
- `lib/validator.js`：无需改动，已导出 `assertStatus`。
- `skills/workflow-new/SKILL.md`
- `skills/workflow-confirm/SKILL.md`
- `skills/workflow-plan/SKILL.md`
- `skills/workflow-exec/SKILL.md`
- `skills/workflow-check/SKILL.md`
- `skills/workflow-archive/SKILL.md`
- `test/validator.test.js`：新增 `--assert-status` CLI 测试与 Skill 文本检查。
- `.workflow/requirements/REQ-0001.md`、`.workflow/plans/REQ-0001-plan.md`、`.workflow/implementations/REQ-0001-implementation.md`

### 行为变化

- CLI 新增 `workflow-template --assert-status REQ-xxxx --status <status1> [--status <status2>]`。
- 状态匹配时退出码 0，不匹配或 REQ 不存在时退出码 1 并输出错误。
- Skills 文本中增加“MUST”级工具调用指令。

### 影响对象

- 用户：调用 Skill 时会看到 Agent 先读取上下文并运行校验。
- 系统：`.workflow/` 文件一致性得到强制保证。
- 运维 / 数据：无。

## 4. 方案设计

### 4.1 CLI 扩展

在 `bin/workflow.js` 的 `parseArgs` 中新增：

```js
'assert-status': { type: 'boolean' },
status: { type: 'string', multiple: true },
```

处理逻辑：

```js
} else if (options.command === 'assert-status') {
  if (!options['assert-status-id']) throw new Error('--assert-status requires an ID argument');
  if (!options.status || options.status.length === 0) throw new Error('--assert-status requires at least one --status');
  await assertStatus(`${process.cwd()}/.workflow`, options['assert-status-id'], options.status);
  print(`Requirement ${options['assert-status-id']} status is allowed.`, options.format);
}
```

由于 `parseArgs` 的 `type: 'boolean'` 选项不能接受值，需要像 `--sync-current` 一样做参数归一化：如果 `--assert-status` 后面紧跟非 `--` 参数，则视为 `--assert-status-id`。

### 4.2 Skill 改写模式

每个 SKILL.md 统一采用三段式结构：

1. **前置加载（Load）**：列出必须使用 `Read` 读取的文件集合。
2. **前置断言（Assert）**：状态推进前使用 `Bash` 运行 `--assert-status`。
3. **执行与校验（Validate）**：任何 `.workflow/` 文件写入后必须运行 `--validate`。

以 `workflow-exec` 为例：

```markdown
## Execution contract

You MUST enforce this contract using tools, not just reasoning.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Read the target `REQ-*` file.
   - If the requirement references a plan, read `.workflow/plans/REQ-xxxx-plan.md`.
   - If the requirement references an implementation record, read `.workflow/implementations/REQ-xxxx-implementation.md`.
   - Read any referenced `CAP-*` files.

2. **Assert preconditions**
   - Before making any changes, run:
     `workflow-template --assert-status REQ-xxxx --status planned`
   - If the command fails, stop and ask the user whether to route to `workflow-plan` or `workflow-check`.

3. **Perform work**
   - Make only the smallest changes within the accepted requirement and plan.
   - Record material deviations and obtain renewed confirmation before continuing.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If validation fails, fix the records before transitioning status.
   - Transition `planned -> implemented` with a dated history entry, update `updated_at`, and run `workflow-template --sync-index`.
```

其他 Skill 类似，仅调整：

- `workflow-new`：无需状态断言（创建 draft），但创建后必须 `--validate`。
- `workflow-confirm`：断言 `draft`，推进到 `accepted`。
- `workflow-plan`：断言 `accepted`，推进到 `planned`。
- `workflow-check`：断言 `implemented`，推进到 `verified`。
- `workflow-archive`：断言 `verified`，推进到 `archived`。

### 4.3 测试策略

- CLI 测试：通过 `child_process.exec` 调用 `node bin/workflow.js --assert-status ...`，验证退出码与输出。
- Skill 文本测试：读取每个 `skills/workflow-*/SKILL.md`，检查包含 `--validate` 和 `--assert-status` 关键字。

## 5. 数据流 / 调用链路

```text
User: /workflow-exec REQ-0001
  -> Claude Code loads skills/workflow-exec/SKILL.md
  -> Skill prompt instructs Read of current.md, REQ-0001.md, plan, implementation
  -> Agent reads files
  -> Skill prompt instructs Bash: workflow-template --assert-status REQ-0001 --status planned
  -> CLI parses args -> assertStatus('.workflow', 'REQ-0001', ['planned'])
  -> Agent performs code changes
  -> Skill prompt instructs Bash: workflow-template --validate
  -> validateWorkflow('.workflow') runs
  -> Agent updates REQ status and syncs index
```

## 6. 接口 / 数据结构变化

### 新增

- CLI 选项 `--assert-status [id]`（布尔触发 + 参数归一化）
- CLI 选项 `--status <status>`（多值字符串）

### 修改

- `skills/*/SKILL.md` 文本内容

### 删除

- 无。

## 7. 兼容性与迁移

- 兼容性影响：CLI 新增命令，旧命令不受影响。
- 数据迁移：无。
- 配置变更：无。

## 8. 风险与回滚

| 风险                                     | 影响               | 缓解方式                                                |
| ---------------------------------------- | ------------------ | ------------------------------------------------------- |
| Skill 提示过长                           | Agent 忽略部分指令 | 使用编号列表与粗体“MUST”强化；实际验证由 CLI 保证       |
| `--assert-status` 参数解析与现有选项冲突 | CLI 报错           | 使用参数归一化，并补充 CLI 测试                         |
| 用户项目未安装 workflow-template         | Skill 调用失败     | Skill 指令中提示使用 `npx workflow-template` 或本地路径 |

回滚方式：

- 还原 `bin/workflow.js` 改动。
- 还原 `skills/*/SKILL.md` 改动。
- 还原测试新增部分。

## 9. 测试策略

### 自动化测试

- `node --test test/validator.test.js`：新增 `--assert-status` 成功/失败/多状态/缺失参数测试。
- 新增 Skill 文本断言测试：每个 SKILL.md 必须包含 `--validate` 与 `--assert-status`。

### 手工验证

- 在临时目录初始化 workflow，创建一个 `REQ-0001` 处于 `accepted`，运行 `node bin/workflow.js --assert-status REQ-0001 --status accepted` 观察退出码 0。
- 运行 `node bin/workflow.js --assert-status REQ-0001 --status planned` 观察退出码 1。

### 不覆盖项与原因

- 不测试 Agent 是否 100% 遵守 Skill 文本（这是 Claude Code 执行层行为），但通过 CLI 暴露约束，使 Agent 不遵守时会被 CLI 强制拦截。

## 10. 实施步骤

1. 修改 `bin/workflow.js`：新增 `--assert-status` 命令与 `--status` 多值选项。
2. 改写 `skills/workflow-new/SKILL.md`：增加 Load / Validate 指令。
3. 改写 `skills/workflow-confirm/SKILL.md`：增加 Load / Assert (draft) / Validate 指令。
4. 改写 `skills/workflow-plan/SKILL.md`：增加 Load / Assert (accepted) / Validate 指令。
5. 改写 `skills/workflow-exec/SKILL.md`：增加 Load / Assert (planned) / Validate 指令。
6. 改写 `skills/workflow-check/SKILL.md`：增加 Load / Assert (implemented) / Validate 指令。
7. 改写 `skills/workflow-archive/SKILL.md`：增加 Load / Assert (verified) / Validate 指令。
8. 在 `test/validator.test.js` 中新增 `--assert-status` CLI 测试与 Skill 文本测试。
9. 运行 `npm test` 并修复问题。
10. 更新 `.workflow/implementations/REQ-0001-implementation.md` 并推进状态到 `implemented`，再验证到 `verified`。
