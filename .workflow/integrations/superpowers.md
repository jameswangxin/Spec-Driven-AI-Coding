# Superpowers Skill 适配规则

## 目的

Superpowers 提供方法论、流程纪律和检查清单；本项目的业务文档真源是 `docs/changes/` 和 `docs/specs/`。`.workflow/` 只决定治理、模板、状态流和入口。

## 优先级

```text
用户当前明确指令
  > .workflow/project.md 和 .workflow/playbook.md
  > 当前 docs/changes/REQ-xxxx-title 变更包
  > Superpowers Skill 的流程纪律
  > Superpowers Skill 的默认输出路径
```

## 通用落地规则

- 需求探索类产出写入 `docs/changes/REQ-xxxx-title/proposal.md`。
- 技术方案类产出写入同目录 `design.md`。
- 任务拆解写入同目录 `tasks.md`。
- 实施结果写入同目录 `implementation.md`。
- 测试、验证、审查证据写入同目录 `verification.md`。
- 长期生效行为写入 `docs/specs/<domain>/spec.md`；变更中的增量规范先写入变更包 `specs/`。
- 索引和当前上下文变更写入 `.workflow/index.md` 和 `.workflow/current.md`。

## Skill 映射表

| Superpowers Skill | 默认倾向 | 本项目落点 |
| --- | --- | --- |
| `brainstorming` | 生成设计规格，默认写入 `docs/superpowers/specs/` | 写入 proposal；复杂需求再写 design |
| `writing-plans` | 生成实现计划，默认写入 `docs/superpowers/plans/` | 写入 tasks，必要的技术取舍写入 design |
| `executing-plans` | 按计划实施 | 执行结果写入 implementation |
| `subagent-driven-development` | 多代理分任务实施 | 每个子任务结果汇总到 tasks、implementation 和 verification |
| `test-driven-development` | 先写测试，再实现 | 测试设计写入 design；实际命令和结果写入 verification |
| `verification-before-completion` | 完成前必须运行验证 | 验证证据写入 verification |
| `requesting-code-review` | 请求代码审查 | 审查结论写入 verification 或 implementation 偏差 |
| `receiving-code-review` | 处理审查反馈 | 反馈处理写入 implementation 和 verification |
| `systematic-debugging` | 系统化定位问题 | 根因、修复和回归验证写入 implementation 与 verification |

## 禁止事项

- 不直接修改全局 Superpowers Skill。
- 不让 `docs/superpowers/` 成为本项目业务真源。
- 不在没有 `REQ-*` 变更包的情况下直接开始中高风险实现。
- 不把 Skill 输出原文堆进记录，必须按本项目模板转写。
