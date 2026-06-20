# 给 Agent 的使用指南

## 入口规则

处理非平凡需求前，先读取：

1. `.workflow/current.md`
2. `.workflow/project.md`
3. `.workflow/playbook.md`
4. `.workflow/index.md`
5. 当前 `REQ-*`
6. 当前 plan（如果存在）
7. 当前 implementation（如果存在）
8. 相关 `CAP-*`

如果用户指定某个 active 入口，先读取：

```text
.workflow/active/REQ-0001.md
```

再按 active 文件列出的上下文继续。

## 工作原则

- 不要在没有 `REQ-*` 的情况下开始中高风险实现。
- 不要把外部 Skill 的默认路径当成真源。
- 不要只在聊天里报告测试结果，必须写入 implementation。
- 不要覆盖用户未要求修改的文件。
- 如果状态变化不是主干路径，必须在 `history` 中说明原因。

## 产出落点

| 产出 | 文件 |
| --- | --- |
| 需求澄清 | `.workflow/requirements/REQ-0001.md` |
| 技术方案 | `.workflow/plans/REQ-0001-plan.md` |
| 实施和测试结果 | `.workflow/implementations/REQ-0001-implementation.md` |
| 可复用能力 | `.workflow/capabilities/CAP-0001.md` |
| 并行入口 | `.workflow/active/REQ-0001.md` |

## 使用外部 Skill

先读取适配规则：

```text
.workflow/integrations/superpowers.md
.workflow/integrations/trellis.md
```

优先级：

```text
用户当前明确指令
  > .workflow/project.md 和 .workflow/playbook.md
  > 当前 REQ / plan / implementation
  > 外部 Skill 的流程纪律
  > 外部 Skill 的默认输出路径
```

## 完成前验证

完成前必须：

1. 运行验证命令。
2. 阅读输出。
3. 将命令和结果写入 implementation。
4. 对照 `.workflow/checks/workflow-checklist.md` 自检。
5. 再声明完成。
