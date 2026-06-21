# 工作流检查清单

## 1. 文件存在性

- [ ] `.workflow/project.md` 存在。
- [ ] `.workflow/playbook.md` 存在。
- [ ] `.workflow/index.md` 存在。
- [ ] `.workflow/current.md` 存在。
- [ ] 当前 `docs/changes/REQ-xxxx-title/proposal.md` 存在。
- [ ] 状态为 `planned`、`implemented`、`verified` 或 `archived` 时，`design.md` 和 `tasks.md` 存在。
- [ ] 状态为 `implemented`、`verified` 或 `archived` 时，`implementation.md` 存在。
- [ ] 状态为 `verified` 或 `archived` 时，`verification.md` 存在。
- [ ] 如涉及长期行为变化，增量 `specs/` 已合并到 `docs/specs/`。

## 2. Frontmatter 一致性

- [ ] 变更包目录前缀与 proposal `id` 一致，例如 `REQ-0001-title/proposal.md` 的 `id` 是 `REQ-0001`。
- [ ] `status` 属于允许状态。
- [ ] `complexity` 属于 `simple`、`medium`、`complex`。
- [ ] `risk_tags` 只使用允许标签。
- [ ] `history` 至少包含一条记录。
- [ ] 最新 `history.to` 与当前 `status` 一致。
- [ ] `updated_at` 不早于最后一条 history 日期。

## 3. 规划规则

- [ ] `complexity` 是 `medium` 或 `complex` 时，`plan_required` 必须为 `true`。
- [ ] `risk_tags` 包含高风险标签时，`plan_required` 必须为 `true`。
- [ ] `plan_required: false` 时，`plan_reason` 必须说明跳过原因。

## 4. 状态流

- [ ] 需求不能从 `draft` 直接进入 `implemented`。
- [ ] 需求进入 `planned` 前，必须有设计和任务或明确跳过原因。
- [ ] 需求进入 `verified` 前，verification 必须包含验证记录。
- [ ] 需求进入 `archived` 前，必须已经 `verified`。
- [ ] 进入 `blocked`、`canceled`、`reopened`、`superseded` 时，history 必须说明原因。

## 5. 证据记录

- [ ] `implementation.md` 说明实际改动范围和设计偏差。
- [ ] `verification.md` 包含命令、结果和备注。
- [ ] 未运行测试时，说明原因、替代验证和残余风险。
- [ ] 后续事项已填写；没有后续事项时明确写「无」。

## 6. Git / PR

- [ ] 分支名包含 `REQ-*`。
- [ ] commit message 包含 `REQ-*`。
- [ ] PR 描述链接 proposal、design、implementation 和 verification。
- [ ] CI 或本地验证结果已写入 verification。

## 7. 并行工作

- [ ] 单需求工作可以使用 `current.md`。
- [ ] 多需求并行时，每个活动需求应在 `.workflow/active/` 中有独立入口。
- [ ] active 入口指向正确的变更包和验证命令。
