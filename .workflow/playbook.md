# 流程手册

## 1. 新建变更包

1. 阅读 `.workflow/project.md`、`.workflow/index.md` 和 `.workflow/templates/proposal.md`。
2. 根据 `docs/changes/` 与 `docs/changes/archive/` 中最大 `REQ-*` 编号创建下一个目录。
3. 创建 `docs/changes/REQ-xxxx-title/proposal.md`。
4. 保留用户原始需求，不擅自改写。
5. 填写背景、目标、边界、业务规则和验收标准。
6. 更新 `.workflow/index.md` 和 `.workflow/current.md`。
7. 如果需求还不清楚，停在 `draft`，先向用户澄清。

## 2. 需求确认

1. 阅读 proposal 和相关上下文。
2. 梳理术语定义、业务规则、数据流、权限、安全和数据一致性。
3. 找到关键不确定点，并向用户提问。
4. 用户确认后，将 proposal 状态从 `draft` 更新为 `accepted`。
5. 在 `history` 中记录状态变化和原因。

## 3. 技术设计与任务

1. 阅读 proposal、项目地图、流程手册和相关领域规范。
2. 使用模板创建同目录下的 `design.md` 和 `tasks.md`。
3. 写清目标、非目标、改动范围、数据流、接口变化、兼容性、风险和测试策略。
4. 若会改变长期系统行为，在变更包 `specs/` 中写增量规范。
5. 等待用户确认设计，或在用户已授权实施时继续。
6. 将 proposal 状态更新为 `planned`。

## 4. 实施开发

1. 从 `.workflow/current.md` 进入当前上下文。
2. 按 `design.md` 和 `tasks.md` 做最小必要改动。
3. 不修改无关文件、本地配置或历史记录。
4. 如果实现中发现设计偏差，记录偏差；偏差影响范围较大时暂停并重新确认。
5. 创建或更新 `implementation.md`。
6. 将 proposal 状态更新为 `implemented`。

## 5. 验证记录

1. 运行设计中列出的测试命令。
2. 创建或更新 `verification.md`，记录命令、结果和关键输出。
3. 如果测试无法运行，记录原因、替代验证和残余风险。
4. 对照验收标准和 tasks 做自审。
5. 将 proposal 状态更新为 `verified`。

## 6. 归档关闭

1. 确认 proposal 状态为 `verified`。
2. 检查 `verification.md` 是否包含测试、风险和后续事项。
3. 如果存在增量规范，将已确认内容合并到 `docs/specs/`。
4. 将 proposal 状态更新为 `archived`。
5. 将整个目录移动到 `docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/`。
6. 更新 `.workflow/index.md`、`.workflow/current.md` 或 active 入口。

## 7. 状态回退和异常状态

适用场景：

- 需求被取消。
- 需求被阻塞。
- 已验证需求需要重新打开。
- 当前需求被后续需求替代。

执行步骤：

1. 判断目标状态：`blocked`、`canceled`、`reopened` 或 `superseded`。
2. 在 proposal frontmatter 中更新 `status`。
3. 在 `history` 中追加状态变化、原因和下一步。
4. 更新 `.workflow/index.md`。
5. 如果已有实施或验证记录，补充残余风险或后续事项。

## 8. 并行工作入口

1. 在 `.workflow/active/` 中创建 `REQ-xxxx.md`。
2. 写入 proposal、design、tasks、branch 和验证命令链接。
3. Agent 处理该需求时，从 active 文件进入上下文。
4. 需求完成、取消或归档后，删除 active 入口。

## 9. 外部 Skill 接入

1. 根据 Skill 来源读取对应适配规则：
   - Superpowers：`.workflow/integrations/superpowers.md`
   - Trellis：`.workflow/integrations/trellis.md`
2. 遵守外部 Skill 的流程纪律和门控要求。
3. 将产出按本项目规则转写到 `docs/changes/REQ-xxxx-title/` 或 `docs/specs/`。
4. 如果 Skill 默认输出路径与本项目冲突，以 `docs/changes/` 和 `docs/specs/` 为业务真源。

## 10. Git / PR 集成

1. 阅读 `.workflow/git.md`。
2. 创建包含 `REQ-*` 的分支名，例如 `req-0001-short-title`。
3. commit message 使用 `feat(req-0001): ...` 这类格式。
4. PR 描述链接 proposal、design、implementation 和 verification。
5. 将 CI 或本地验证结果写入 verification。
6. 合并后更新 index、current 或 active 入口。
