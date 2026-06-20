# Superpowers Skill 适配规则

## 目的

本文件定义 Superpowers Skill 在本项目中的使用方式。Superpowers 提供方法论、流程纪律和检查清单；本项目的 `.workflow/` 决定文档真源、模板格式、状态流和最终产出落点。

## 优先级

当 Superpowers Skill 与本项目规则发生冲突时，按以下优先级处理：

```text
用户当前明确指令
  > .workflow/project.md 和 .workflow/playbook.md
  > 当前 REQ / plan / implementation
  > Superpowers Skill 的流程纪律
  > Superpowers Skill 的默认输出路径
```

说明：

- Skill 的门控和方法论仍需尊重，例如先设计、再计划、再实施，完成前必须验证。
- Skill 的默认输出路径不自动成为本项目真源。
- 如果用户明确要求同时保留 Skill 默认路径，必须在 `.workflow` 中记录摘要，并说明 `.workflow` 是真源。

## 通用落地规则

- 需求探索类产出写入 `.workflow/requirements/REQ-xxxx.md`。
- 技术方案类产出写入 `.workflow/plans/REQ-xxxx-plan.md`。
- 实施、测试、验证、审查类产出写入 `.workflow/implementations/REQ-xxxx-implementation.md`。
- 可复用能力、约束或接口契约写入 `.workflow/capabilities/CAP-xxxx.md`。
- 索引和当前上下文变更写入 `.workflow/index.md` 和 `.workflow/current.md`。

## Skill 映射表

| Superpowers Skill | 默认倾向 | 本项目落点 |
| --- | --- | --- |
| `brainstorming` | 生成设计规格，默认写入 `docs/superpowers/specs/` | 写入 `REQ-*` 的原始需求、需求确认、业务规则、边界条件、验收标准和测试用例；复杂需求再写 `plan` |
| `writing-plans` | 生成实现计划，默认写入 `docs/superpowers/plans/` | 写入 `.workflow/plans/REQ-xxxx-plan.md`，使用中文技术方案结构 |
| `executing-plans` | 按计划实施 | 执行结果写入 `.workflow/implementations/REQ-xxxx-implementation.md` |
| `subagent-driven-development` | 多代理分任务实施 | 每个子任务结果汇总到当前实施记录，不另建平行真源 |
| `test-driven-development` | 先写测试，再实现 | 测试设计写入 plan 的「测试策略」，实际测试命令和结果写入 implementation 的「测试记录」 |
| `verification-before-completion` | 完成前必须运行验证 | 验证证据写入 implementation 的「测试记录」和「自审结果」 |
| `requesting-code-review` | 请求代码审查 | 审查结论写入 implementation 的「自审结果」或新增「审查记录」 |
| `receiving-code-review` | 处理审查反馈 | 反馈处理写入 implementation 的「与方案的偏差」和「后续事项」 |
| `systematic-debugging` | 系统化定位问题 | 问题、根因、修复和回归验证写入当前需求和实施记录 |

## `brainstorming` 适配

使用 `brainstorming` 时，仍然遵守它的探索和批准门控，但书面产出按本项目模板转写：

| 头脑风暴内容 | `.workflow` 落点 |
| --- | --- |
| 用户原始想法 | `REQ-*` 的「原始需求」 |
| 目的、约束、成功标准 | `REQ-*` 的「背景与目标」和「验收标准」 |
| 方案选择和权衡 | `REQ-*` 的「需求确认」；复杂时进入 plan 的「方案设计」 |
| 边界和异常 | `REQ-*` 的「边界条件」和「测试用例」 |
| 用户批准结果 | `REQ-*` 的 `history` 和「变更记录」 |

如果 Skill 要求写设计文档，默认不写 `docs/superpowers/specs/`，而是将设计内容合并到当前 `REQ-*`。只有用户明确要求保留外部路径时，才创建额外文档。

## `writing-plans` 适配

使用 `writing-plans` 时，计划内容必须落到当前需求对应的方案文件：

```text
.workflow/plans/REQ-xxxx-plan.md
```

要求：

- 使用本项目中文技术方案模板。
- 保留任务拆解、测试策略和验证命令。
- 不要求沿用 Superpowers 的计划头部格式。
- 如果计划包含执行方式建议，应写入「实施步骤」或「风险与回滚」，不要替代本项目状态流。

## 测试和验证适配

`test-driven-development` 和 `verification-before-completion` 的核心纪律保留：

- 没有运行验证命令，不能声称完成。
- 测试命令、结果和未覆盖风险必须写入实施记录。
- 如果测试无法运行，必须写明原因、替代验证和残余风险。

本项目实施记录中至少保留：

```markdown
## 3. 测试记录

| 命令 / 验证方式 | 结果 | 备注 |
| --- | --- | --- |
```

## 审查适配

代码审查类 Skill 的结果不单独成为真源。它们应汇总进当前实施记录：

- 问题和风险：写入「自审结果」。
- 需要变更的实现偏差：写入「与方案的偏差」。
- 暂不处理的事项：写入「后续事项」。

## 禁止事项

- 不直接修改全局 Superpowers Skill。
- 不让 `docs/superpowers/` 成为本项目真源。
- 不在没有 `REQ-*` 的情况下直接开始中高风险实现。
- 不把 Skill 输出原文堆进实施记录，必须按本项目模板转写。
