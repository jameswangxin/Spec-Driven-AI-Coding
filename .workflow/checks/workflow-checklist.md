# 工作流检查清单

## 1. 文件存在性

- [ ] `.workflow/project.md` 存在。
- [ ] `.workflow/playbook.md` 存在。
- [ ] `.workflow/index.md` 存在。
- [ ] `.workflow/current.md` 存在。
- [ ] 当前 `REQ-*` 文件存在。
- [ ] 如果 `plan_required: true`，对应 plan 文件存在。
- [ ] 如果需求状态是 `implemented`、`verified` 或 `archived`，对应 implementation 文件存在。
- [ ] 需求引用的 `CAP-*` 文件存在。

## 2. Frontmatter 一致性

- [ ] `id` 与文件名一致，例如 `REQ-0001.md` 的 `id` 是 `REQ-0001`。
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
- [ ] 需求进入 `planned` 前，必须有 plan 或明确跳过方案原因。
- [ ] 需求进入 `verified` 前，implementation 必须包含测试记录。
- [ ] 需求进入 `archived` 前，必须已经 `verified`。
- [ ] 进入 `blocked`、`canceled`、`reopened`、`superseded` 时，history 必须说明原因。

## 5. 实施记录

- [ ] 实际改动范围已填写。
- [ ] 与方案的偏差已填写；无偏差时明确写「无」。
- [ ] 测试记录包含命令、结果和备注。
- [ ] 未运行测试时，说明原因、替代验证和残余风险。
- [ ] 后续事项已填写；没有后续事项时明确写「无」。

## 6. Git / PR

- [ ] 分支名包含 `REQ-*`。
- [ ] commit message 包含 `REQ-*`。
- [ ] PR 描述链接 requirement、plan 和 implementation。
- [ ] CI 或本地验证结果已写入 implementation。

## 7. 并行工作

- [ ] 单需求工作可以使用 `current.md`。
- [ ] 多需求并行时，每个活动需求应在 `.workflow/active/` 中有独立入口。
- [ ] active 入口指向正确的 requirement、plan、implementation 和验证命令。
