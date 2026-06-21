# REQ-0001 验证

## 验证记录

| 命令 / 验证方式 | 结果 | 备注 |
| --- | --- | --- |
| `npm run check` | 通过 | Node 语法检查通过 |
| `npm test` | 通过 | 98 passed |
| `npm run pack:check` | 通过 | dry-run 包含 `template/docs/scaffold/` 和新文档模板；不再包含旧业务空目录 |
| `git diff --check` | 通过 | 无 whitespace 错误 |
| 旧路径扫描 | 通过 | 未发现旧业务目录、旧 capability schema 或旧 capability marker 残留 |

## 验收标准对照

| 验收标准 | 证据 | 结果 |
| --- | --- | --- |
| 初始化后同时拥有治理骨架和 docs 骨架 | installer 测试和 pack dry-run | 通过 |
| validator 从 docs/changes 校验状态和阶段产物 | validator 测试 | 通过 |
| sync-index/current 生成 docs/changes 链接 | validator 测试 | 通过 |
| 六个 workflow Skills 使用新落点 | Skill 契约测试和路径扫描 | 通过 |
| 发布前检查通过 | `npm run check`、`npm test`、`npm run pack:check` | 通过 |

## 残余风险

- 未执行 npm publish。
- 未推送远程仓库。

## 后续事项

- 需要用户确认后再推送或发布。

