# Git / PR 最小集成约定

## 目标

让代码变更、需求、方案、实施记录和验证结果可以互相追溯。本约定不绑定具体 Git 平台。

## 分支命名

推荐格式：

```text
req-0001-short-title
fix-req-0001-short-title
chore-req-0001-short-title
```

要求：

- 分支名必须包含 `REQ-*` 编号的小写形式，例如 `req-0001`。
- 多个需求不要共用一个长期分支。
- 紧急修复也要绑定一个 `REQ-*`，哪怕是简单低风险需求。

## Commit Message

推荐格式：

```text
feat(req-0001): add export workflow
fix(req-0001): handle empty export result
docs(req-0001): update implementation record
test(req-0001): cover export validation
```

要求：

- commit message 必须包含 `req-0001` 这类需求编号。
- 同一 commit 不应混入无关需求。
- 修改需求、方案或实施记录时，也要引用对应 `REQ-*`。

## PR 描述

PR 描述至少包含：

```markdown
## Requirement

- `.workflow/requirements/REQ-0001.md`

## Plan

- `.workflow/plans/REQ-0001-plan.md`

## Implementation

- `.workflow/implementations/REQ-0001-implementation.md`

## Verification

- `command`: result

## Risk

- none / residual risk
```

要求：

- PR 必须链接 requirement。
- 如果 `plan_required: true`，PR 必须链接 plan。
- PR 必须链接 implementation。
- CI 或本地验证结果必须写入 implementation，不只写在 PR 描述里。

## CI / 本地验证

验证结果落点：

```text
.workflow/implementations/REQ-0001-implementation.md
```

记录格式：

```markdown
| 命令 / 验证方式 | 结果 | 备注 |
| --- | --- | --- |
| `npm test` | 通过 | 120 passed |
```

如果 CI 失败：

- 不得将需求状态更新为 `verified`。
- 在 implementation 中记录失败命令、失败原因和后续处理。
- 必要时将需求状态更新为 `blocked` 或 `reopened`。

## 合并后

合并后检查：

- [ ] implementation 已记录最终测试结果。
- [ ] index 中需求状态已更新。
- [ ] current 或 active 入口已清理或指向下一项工作。
- [ ] 如产生可复用能力，已创建或更新 `CAP-*`。
