# REQ-0001 活动入口

## 当前需求

- Requirement: `.workflow/requirements/REQ-0001.md`
- Plan: `.workflow/plans/REQ-0001-plan.md`
- Implementation: `.workflow/implementations/REQ-0001-implementation.md`
- Branch: `req-0001-export-report`

## 必读上下文

1. `.workflow/project.md`
2. `.workflow/playbook.md`
3. `.workflow/index.md`
4. `.workflow/git.md`
5. `.workflow/requirements/REQ-0001.md`
6. `.workflow/plans/REQ-0001-plan.md`
7. `.workflow/implementations/REQ-0001-implementation.md`

## 允许范围

- 实现报表 CSV 导出。
- 增加必要测试。
- 更新实施记录。

## 禁止范围

- 不实现 Excel。
- 不实现异步导出。

## 验证命令

- `command`

## 风险

- 导出数据量过大。
- 权限校验遗漏。
