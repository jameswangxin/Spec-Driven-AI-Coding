# Trellis Skill 适配规则

## 目的

本文件定义未来接入 Trellis 归档需求类 Skill 时的本项目适配方式。Trellis 可以提供归档动作和检查思路，但本项目的 `.workflow/` 决定状态流、归档记录和历史保留规则。

## 优先级

当 Trellis Skill 与本项目规则发生冲突时，按以下优先级处理：

```text
用户当前明确指令
  > .workflow/project.md 和 .workflow/playbook.md
  > 当前 REQ / plan / implementation
  > Trellis Skill 的流程纪律
  > Trellis Skill 的默认输出路径
```

Trellis Skill 的默认输出路径不自动成为本项目真源。若默认输出路径与 `.workflow/` 冲突，必须以 `.workflow/` 的需求、方案、实施记录和索引为准。

## 归档契约

归档需求不是删除需求。归档表示需求已经关闭，历史必须继续可追溯。

归档前必须检查：

- 当前需求状态是否为 `verified`。
- 实施记录是否包含测试记录。
- 实施记录是否说明残余风险。
- 实施记录是否列出后续事项，或明确写 `无`。
- `.workflow/index.md` 是否保留该需求。

## Trellis 归档动作映射

| Trellis 动作 | 本项目动作 |
| --- | --- |
| archive requirement | 将 `REQ-*` 状态更新为 `archived` |
| close requirement | 在 `history` 中追加关闭记录，并更新 `.workflow/index.md` |
| summarize outcome | 写入 implementation 的「经验总结」或「后续事项」 |
| validate completion | 检查 implementation 的测试记录、自审结果和残余风险 |
| move to archive folder | 本项目默认不移动文件，只更新状态 |
| delete completed artifacts | 禁止删除；只能归档状态 |

## 归档步骤

1. 读取 `.workflow/project.md`、`.workflow/playbook.md`、当前 `REQ-*` 和 implementation。
2. 确认需求状态为 `verified`。
3. 检查实施记录是否包含测试、风险、后续事项和 Commit / PR 信息。
4. 在需求 frontmatter 中将状态更新为 `archived`。
5. 在 `history` 中追加：

```yaml
- date: YYYY-MM-DD
  from: verified
  to: archived
  note: 需求已归档，实施记录和验证证据保留。
```

6. 在需求「变更记录」中追加归档说明。
7. 更新 `.workflow/index.md` 中的需求状态。
8. 如果归档过程中发现可复用能力，创建或更新 `CAP-*`。
9. 在 implementation 的「经验总结」或「后续事项」中记录归档结论。

## 取消需求适配

如果 Trellis Skill 表达的是取消而不是完成归档：

- 不应把状态改为 `archived`。
- 应在需求中记录取消原因。
- 如果已有实现改动，必须记录是否需要回滚。
- `.workflow/index.md` 必须保留需求记录和取消说明。

未来如果需要正式取消状态，可以通过新需求扩展状态流，例如：

```text
draft -> canceled
accepted -> canceled
planned -> canceled
```

在当前版本中，取消需求先按 `.workflow/playbook.md` 的「需求取消」执行。

## 禁止事项

- 不删除 `REQ-*`、plan、implementation 或 capability 文件。
- 不把归档文件移动到外部目录，除非后续需求明确修改目录协议。
- 不绕过 `verified` 直接归档已实施需求。
- 不把 Trellis 的默认归档格式作为本项目真源。
