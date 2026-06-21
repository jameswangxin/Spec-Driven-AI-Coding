# REQ-0001 技术设计

## 1. 目标

将业务文档真源迁移到 `docs/changes/REQ-xxxx-title/` 和 `docs/specs/`，同时保留 `.workflow/` 的治理、校验、入口和 Skill 集成能力。

## 2. 非目标

- 不实现 OpenSpec CLI 兼容层。
- 不保留旧业务目录作为兼容输入。
- 不发布 npm 包。

## 3. 改动范围

- `lib/installer.js` 初始化 docs 骨架。
- `lib/validator.js` 校验变更包。
- `lib/orchestrator.js` 读取 proposal 和 design。
- `skills/workflow-*/SKILL.md` 更新执行契约。
- `.workflow/`、`template/workflow/`、`template/docs/` 和公开文档更新路径模型。

## 4. 方案设计

`.workflow/` 保持为治理根。CLI 公共函数继续接收 `.workflow` 路径，并通过父目录定位 `docs/`。proposal frontmatter 承载 `REQ-*` 状态机；design、tasks、implementation 和 verification 按阶段出现。归档时整个变更包移动到 `docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/`。

## 5. 数据流 / 调用链路

```text
workflow-template 命令
  -> .workflow 治理根
  -> docs/changes 变更包
  -> docs/specs 当前规范
  -> .workflow/index.md 与 current.md 指针
```

## 6. 接口 / 数据结构变化

- proposal schema 删除 `capabilities`，新增 `specs`。
- validator 返回 requirements，不再返回 capabilities。
- orchestrator audit 使用项目根相对的 `docs/changes/...` 路径。

## 7. 兼容性与迁移

这是全新项目结构，不迁移旧项目业务文档。旧模板目录会被移除或停止作为真源。

## 8. 风险与回滚

| 风险 | 影响 | 缓解方式 |
| --- | --- | --- |
| 旧路径残留 | Agent 写回错误目录 | 使用路径扫描和测试阻断 |
| validator 与 orchestrator 路径不一致 | 编排读取失败 | 共用变更包定位规则 |
| npm 包漏掉 docs 模板 | 新项目初始化不完整 | pack dry-run 检查 |

## 9. 测试策略

- `node --test test/installer.test.js`
- `node --test test/validator.test.js`
- `node --test test/orchestrator.test.js`
- `npm test`
- `npm run check`
- `npm run pack:check`

## 10. 实施步骤

1. 初始化 docs 骨架和模板。
2. 改造 validator 和 schema。
3. 改造 orchestrator。
4. 更新 Skills、治理文档和公开文档。
5. 运行全量验证并记录结果。

