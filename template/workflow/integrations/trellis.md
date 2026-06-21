# Trellis Skill 适配规则

## 目的

Trellis 可以提供归档动作和检查思路，但本项目的业务真源是 `docs/changes/` 和 `docs/specs/`。`.workflow/` 只维护治理入口。

## 优先级

```text
用户当前明确指令
  > .workflow/project.md 和 .workflow/playbook.md
  > 当前 docs/changes/REQ-xxxx-title 变更包
  > Trellis Skill 的流程纪律
  > Trellis Skill 的默认输出路径
```

## 归档契约

归档需求不是删除需求。归档表示需求已经关闭，历史必须继续可追溯。

归档前必须检查：

- 当前 proposal 状态是否为 `verified`。
- `verification.md` 是否包含测试记录。
- `verification.md` 是否说明残余风险。
- `verification.md` 是否列出后续事项，或明确写 `无`。
- `.workflow/index.md` 是否保留该需求。
- 如有增量规范，是否已合并到 `docs/specs/`。

## Trellis 归档动作映射

| Trellis 动作 | 本项目动作 |
| --- | --- |
| archive requirement | 将 proposal 状态更新为 `archived` |
| close requirement | 在 `history` 中追加关闭记录，并更新 `.workflow/index.md` |
| summarize outcome | 写入 verification 或 implementation 的经验总结 |
| validate completion | 检查 verification 的测试记录和残余风险 |
| move to archive folder | 移动整个变更包到 `docs/changes/archive/` |
| delete completed artifacts | 禁止删除；只能移动归档 |

## 归档步骤

1. 读取 `.workflow/project.md`、`.workflow/playbook.md` 和当前变更包。
2. 确认 proposal 状态为 `verified`。
3. 检查 implementation 和 verification 是否包含测试、风险、后续事项和 Commit / PR 信息。
4. 合并增量 `specs/` 到 `docs/specs/`。
5. 在 proposal frontmatter 中将状态更新为 `archived`。
6. 在 `history` 中追加归档记录。
7. 将目录移动到 `docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/`。
8. 更新 `.workflow/index.md` 和 `.workflow/current.md`。

## 禁止事项

- 不删除 proposal、design、tasks、implementation、verification 或 specs。
- 不绕过 `verified` 直接归档已实施需求。
- 不把 Trellis 的默认归档格式作为本项目真源。
