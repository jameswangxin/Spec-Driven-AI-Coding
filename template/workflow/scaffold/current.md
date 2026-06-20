# Current Workflow Context

## Current Requirement

本文件是默认入口，适合单需求工作或当前主线工作。多个需求并行时，不要反复覆盖本文件，应使用 `.workflow/active/REQ-xxxx.md`。

当前目标项目还没有活动需求。首次使用时，请创建：

- `.workflow/requirements/REQ-0001.md`
- `.workflow/plans/REQ-0001-plan.md`（如果需要方案）
- `.workflow/implementations/REQ-0001-implementation.md`

创建后，更新本文件，让 Agent 从当前需求进入上下文。

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
6. 当前 `REQ-*` 需求文件
7. 当前 `REQ-*` 技术方案（如果存在）
8. 当前 `REQ-*` 实施记录（如果存在）
9. 需求引用的 `CAP-*` 能力规格
10. `.workflow/git.md`
11. 涉及外部 Skill 时，读取 `.workflow/integrations/` 下的对应适配规则

## Allowed Scope

- 使用 `.workflow/` 记录目标项目自己的需求、方案、实施和验证。
- 使用 templates 创建新文件。
- 使用 integrations 约束外部 Skill 产出物落点。
- 多需求并行时，使用 active 入口隔离上下文。
- 使用 Git / PR 约定保持代码和需求可追溯。

## Out of Scope

- 复制模板仓库根 `.workflow/` 的历史需求。
- 把示例实例当作目标项目真源。
- 修改全局 Superpowers 或 Trellis Skill。

## Known Risks

- 如果误复制模板仓库根 `.workflow/`，目标项目会继承无关历史需求。
- 如果跳过需求确认，中高复杂度需求容易扩大范围。
- 外部 Skill 默认路径可能与 `.workflow/` 冲突，需按 integrations 规则处理。
- 如果多个需求并行但共用 current，Agent 可能读取错误上下文。

## Required Verification

- 确认当前 `REQ-*`、plan、implementation 链接存在。
- 确认测试或替代验证已写入 implementation。
- 完成前运行必要验证命令，并记录结果。
