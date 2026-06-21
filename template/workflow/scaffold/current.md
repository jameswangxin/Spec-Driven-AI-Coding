# Current Workflow Context

## Current Requirement

本文件是默认入口，适合单需求工作或当前主线工作。多个需求并行时，不要反复覆盖本文件，应使用 `.workflow/active/REQ-xxxx.md`。

<!-- workflow:current:start -->
当前目标项目还没有活动需求。首次使用时，请创建：

- `docs/changes/REQ-0001-title/proposal.md`
- `docs/changes/REQ-0001-title/design.md`（如果需要设计）
- `docs/changes/REQ-0001-title/tasks.md`（进入计划阶段后）
- `docs/changes/REQ-0001-title/implementation.md`（实施后）
- `docs/changes/REQ-0001-title/verification.md`（验证后）

创建后，更新本文件，让 Agent 从当前变更包进入上下文。
<!-- workflow:current:end -->

并行工作时，创建：

```text
.workflow/active/REQ-0001.md
```

并让 Agent 从 active 文件进入上下文。

## Required Reading Before Coding

1. `.workflow/current.md`
2. `.workflow/project.md`
3. `.workflow/playbook.md`
4. `.workflow/index.md`
5. 并行工作时的 `.workflow/active/REQ-xxxx.md`
6. 当前 `docs/changes/REQ-xxxx-title/proposal.md`
7. 当前 `docs/changes/REQ-xxxx-title/design.md`（如果存在）
8. 当前 `docs/changes/REQ-xxxx-title/tasks.md`（如果存在）
9. 当前 `docs/changes/REQ-xxxx-title/implementation.md`（如果存在）
10. 当前 `docs/changes/REQ-xxxx-title/verification.md`（如果存在）
11. `.workflow/git.md`
12. 涉及外部 Skill 时，读取 `.workflow/integrations/` 下的对应适配规则

## Allowed Scope

- 使用 `.workflow/` 记录治理、索引、入口和验证规则。
- 使用 `docs/changes/` 记录目标项目自己的变更包。
- 使用 `docs/specs/` 记录当前生效的领域规范。
- 使用 templates 创建新文件。
- 多需求并行时，使用 active 入口隔离上下文。

## Out of Scope

- 把业务需求正文写回 `.workflow/requirements/`、`plans/` 或 `implementations/`。
- 把示例实例当作目标项目真源。
- 修改全局 Superpowers 或 Trellis Skill。

## Known Risks

- 如果多个需求并行但共用 current，Agent 可能读取错误上下文。
- 如果 `.workflow/` 和 `docs/changes/` 信息不同步，状态判断会失真。

## Required Verification

- 确认当前 proposal、design、tasks、implementation、verification 链接存在。
- 确认测试或替代验证已写入 verification。
- 完成前运行必要验证命令，并记录结果。
