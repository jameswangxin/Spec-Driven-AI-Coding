# REQ-0001 实施记录

## 1. 实际改动范围

| 文件 / 模块                                                 | 改动说明                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `.workflow/index.md`                                        | 为 Active Work 与 Capability Specs 表补全 `workflow:*:start/end` 受管理标记               |
| `.workflow/current.md`                                      | 为 Current Requirement 区块补全 `workflow:current:start/end` 受管理标记                   |
| `.workflow/requirements/REQ-0001.md`                        | 新建需求记录，覆盖规则可执行化与真源记录修复                                              |
| `.workflow/plans/REQ-0001-plan.md`                          | 新建技术方案，迁入原 `docs/superpowers/plans/2026-06-20-workflow-enforcement.md` 有效内容 |
| `.workflow/implementations/REQ-0001-implementation.md`      | 新建实施记录（本文件）                                                                    |
| `docs/superpowers/plans/2026-06-20-workflow-enforcement.md` | 内容迁移完成后删除，避免与 `.workflow/` 真源冲突                                          |

## 2. 与方案的偏差

- 无重大偏差。
- 创建需求时 `capabilities` 保持为空数组，未创建 CAP，避免空引用校验失败。

## 3. 测试记录

| 命令 / 验证方式                                | 结果 | 备注                                                                   |
| ---------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| `node bin/workflow.js --validate`              | 通过 | 输出 `Workflow validation passed.`                                     |
| `node bin/workflow.js --sync-index`            | 通过 | 输出 `Workflow index synchronized.`，index Active Work 表出现 REQ-0001 |
| `node bin/workflow.js --sync-current REQ-0001` | 通过 | 输出 `Workflow current context synchronized.`，current 指向 REQ-0001   |
| `npm test`                                     | 通过 | 36 passed, 0 failed                                                    |
| `git diff --check`                             | 通过 | 无输出，退出码 0                                                       |

## 4. 自审结果

- 需求范围已对齐：是。
- 方案偏差已记录：是，无重大偏差。
- 测试结果已记录：是，全部命令通过。
- 残余风险已说明：是。

## 5. 残余风险

- 删除 `docs/superpowers/plans/2026-06-20-workflow-enforcement.md` 后，若其他外部链接指向该路径会 404；已在实施前搜索全仓引用，未发现直接依赖。
- 后续若新增需求，需继续使用 `.workflow/` 模板，避免再次回到 `docs/superpowers/plans/`。

## 6. 后续事项

- 无。

## 7. Commit / PR

- commit：未提交，等待用户执行（建议：`git add .workflow docs/superpowers/plans && git commit -m "docs(req-0001): 工作流规则可执行化与真源记录"`）
- PR：未提交

## 8. 经验总结

- `.workflow/index.md` 与 `current.md` 必须使用 scaffold 模板一致的受管理标记，否则 CLI 同步会直接失败。
- 任何工作流改动都应先创建 `REQ-*` / plan / implementation，再执行变更，否则自身无法被工作流工具审计。
- `capabilities` 引用必须指向真实存在的 CAP 文件，否则 `validate` 会报 `WF_CAPABILITY_MISSING`。
