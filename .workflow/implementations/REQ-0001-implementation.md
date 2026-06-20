# REQ-0001 实施记录

## 1. 实际改动范围

| 文件 / 模块                          | 改动说明                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `bin/workflow.js`                    | 新增 `--assert-status` 命令与 `--status` 多值选项，暴露 `assertStatus`。       |
| `skills/workflow-new/SKILL.md`       | 增加执行契约：强制读取上下文、修改后 `--validate`。                            |
| `skills/workflow-confirm/SKILL.md`   | 增加执行契约：读取上下文、`--assert-status draft`、修改后 `--validate`。       |
| `skills/workflow-plan/SKILL.md`      | 增加执行契约：读取上下文、`--assert-status accepted`、修改后 `--validate`。    |
| `skills/workflow-exec/SKILL.md`      | 增加执行契约：读取上下文、`--assert-status planned`、修改后 `--validate`。     |
| `skills/workflow-check/SKILL.md`     | 增加执行契约：读取上下文、`--assert-status implemented`、修改后 `--validate`。 |
| `skills/workflow-archive/SKILL.md`   | 增加执行契约：读取上下文、`--assert-status verified`、修改后 `--validate`。    |
| `test/validator.test.js`             | 新增 `--assert-status` CLI 测试与 Skill 文本契约检查。                         |
| `.workflow/requirements/REQ-0001.md` | 记录需求、状态流转。                                                           |
| `.workflow/plans/REQ-0001-plan.md`   | 记录技术方案。                                                                 |

## 2. 与方案的偏差

- 无。

## 3. 测试记录

| 命令 / 验证方式 | 结果 | 备注                |
| --------------- | ---- | ------------------- |
| `npm test`      | 通过 | 61 passed, 0 failed |

## 4. 自审结果

- 需求范围已对齐：是。
- 方案偏差已记录：无偏差。
- 测试结果已记录：是。
- 残余风险已说明：见下。

## 5. 残余风险

- Skill 文本仍依赖 Agent 读取和执行，CLI 只是最后一道强制闸门；无法 100% 阻止 Agent 在调用 `--validate` 前擅自推进状态，但失败后状态不一致会被 `--validate` 捕获。
- 用户项目可能未安装 `workflow-template`，Skill 指令中已提示使用 `npx workflow-template` 或本地路径。

## 6. 后续事项

- 无。

## 7. Commit / PR

- commit：`feat(req-0001): expose assertStatus in CLI and add execution contracts to workflow skills`
- PR：待提交（本地验证已通过）

## 8. 经验总结

- 将 validator 能力暴露为 CLI 命令是让 Skill 具备可执行约束的最小侵入方案，无需修改 Skill 安装机制。
- Skill 文本中使用 "MUST enforce this contract using tools" 与编号步骤，可以显著提升 Agent 的工具调用概率。
- 测试 CLI 时需要注意 fixture 创建的 `workflowRoot` 与 CLI 期望的 `projectRoot/.workflow` 之间的目录层级差异。
