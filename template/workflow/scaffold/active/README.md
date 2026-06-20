# 并行工作入口

`current.md` 是默认入口，适合单需求工作或当前主线工作。多个需求并行时，不要反复覆盖 `current.md`，应在本目录为每个活动需求创建独立入口。

推荐命名：

```text
.workflow/active/REQ-0001.md
.workflow/active/REQ-0002.md
```

## active 文件模板

```markdown
# REQ-0001 活动入口

## 当前需求

- Requirement: `.workflow/requirements/REQ-0001.md`
- Plan: `.workflow/plans/REQ-0001-plan.md`
- Implementation: `.workflow/implementations/REQ-0001-implementation.md`
- Branch: `req-0001-short-title`

## 必读上下文

1. `.workflow/project.md`
2. `.workflow/playbook.md`
3. `.workflow/index.md`
4. `.workflow/requirements/REQ-0001.md`
5. `.workflow/plans/REQ-0001-plan.md`
6. `.workflow/implementations/REQ-0001-implementation.md`

## 允许范围

- 待填写。

## 禁止范围

- 待填写。

## 验证命令

- `command`

## 风险

- 待填写。
```

## 使用规则

- 单需求工作可以只使用 `current.md`。
- 多需求并行时，每个需求必须有自己的 active 入口。
- active 入口必须指向正确的 requirement、plan 和 implementation。
- 合并或归档后，可以删除对应 active 入口，历史仍保留在 `REQ-*` 文件中。
