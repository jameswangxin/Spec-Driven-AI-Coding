# 工作流安装器与 Codex Skills 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `subagent-driven-development` 或 `executing-plans` 逐任务实施，并用复选框追踪进度。

**目标：** 安全安装 `.workflow/` 模板与六个项目级 Codex Skills，且 `.workflow/` 始终是唯一真源。

**架构：** 零依赖 ESM Node CLI；`lib/installer.js` 承担可单测的文件系统逻辑，`bin/workflow.js` 仅解析参数和输出结果；所有 Skills 只更新现有 `.workflow/` 协议。

**技术栈：** Node.js 20+、Node 标准库、`node:test`、Git。

---

## 文件结构

| 路径 | 职责 |
| --- | --- |
| `package.json` | Node 版本、ESM、bin 和测试命令。 |
| `bin/workflow.js` | CLI 参数、退出码和稳定输出。 |
| `lib/installer.js` | 复制、保护、检查与选择性卸载。 |
| `skills/workflow-*/SKILL.md` | 用户意图到 `.workflow/` 真源的映射。 |
| `test/installer.test.js` | 临时目录中的内建 Node 测试。 |
| `docs/usage.md` | 安装、升级、检查和卸载文档。 |

### 任务 1：定义安装器契约并先建立失败测试

**文件：** 创建 `package.json`、`test/installer.test.js`。

- [ ] 添加私有 ESM 包元数据，设置 `engines.node: >=20`、`bin.workflow-template: bin/workflow.js` 和 `test: node --test`。
- [ ] 编写 `install`、`inspect` 和 `uninstall` 的测试，覆盖完整安装、默认保留、`force` 覆盖、`skillsOnly`、`initOnly`、只读检查、选择性卸载及拒绝用户主目录。
- [ ] 运行 `npm test`；预期失败原因为 `lib/installer.js` 不存在。
- [ ] 提交：`test(安装器): 定义工作流安装契约`。

### 任务 2：实现受管文件安装、检查与卸载

**文件：** 创建 `lib/installer.js`；修改 `test/installer.test.js`。

- [ ] 从模块位置解析固定的 `template/workflow/` 和 `skills/` 源目录；拒绝目标目录等于用户主目录。
- [ ] 实现 `install({ target, force, skillsOnly, initOnly })`：默认只填补缺失模板；仅在 `force` 时覆盖；不读取、删除或覆盖 `.workflow/{requirements,plans,implementations,capabilities}` 中既有记录。
- [ ] 将仅含 `SKILL.md` 的 `workflow-*` 目录复制至目标 `.codex/skills/`；非 workflow Skills 完全不触及。
- [ ] 实现无副作用的 `inspect({ target })`，返回 `.workflow` 和六个 Skills 的缺失状态；实现仅删除受管 `.workflow` 和 `workflow-*` Skills 的 `uninstall`。
- [ ] 运行 `npm test`；预期所有安装器测试通过。
- [ ] 提交：`feat(安装器): 支持工作流模板安全安装`。

### 任务 3：实现 CLI 契约

**文件：** 创建 `bin/workflow.js`；修改 `test/installer.test.js`。

- [ ] 先写子进程测试，覆盖 `--help`、默认安装、`--skills-only`、`--init-only`、`--check`、`--uninstall`、`--yes` 和未知参数。
- [ ] 运行 `npm test -- --test-name-pattern="CLI"`；预期失败，因 CLI 尚不存在。
- [ ] 实现参数解析：默认调用 `install`；`--check` 调用 `inspect` 并在存在缺失内容时返回 1；`--uninstall` 调用卸载；错误输出 stderr 并返回非零。
- [ ] 再运行 CLI 测试；预期全部通过。
- [ ] 提交：`feat(安装器): 提供项目级工作流命令`。

### 任务 4：添加六个 `.workflow/` 真源 Skills

**文件：** 创建 `skills/workflow-new/SKILL.md`、`workflow-confirm/SKILL.md`、`workflow-plan/SKILL.md`、`workflow-exec/SKILL.md`、`workflow-check/SKILL.md`、`workflow-archive/SKILL.md`；修改测试。

- [ ] 先增加精确安装集合测试，期望六个 `workflow-*` Skills；运行测试确认因目录缺失失败。
- [ ] 每个 Skill 都先读取 `.workflow/project.md`、`playbook.md`、`current.md`、`index.md` 和当前 REQ 上下文。
- [ ] `new` 创建需求与入口；`confirm` 只在澄清后推进为 `accepted`；`plan` 按复杂度/风险门控创建 plan 并推进为 `planned`；`exec` 仅在授权或方案确认后实施并记录 implementation；`check` 按 schema/checklist 复核；`archive` 仅允许 `verified -> archived`。
- [ ] 所有状态变化必须写 REQ frontmatter 的 `history`，同步 index/current 或 active；不得创建 `docs/specpilot/` 或其他平行目录。
- [ ] 运行安装集合测试；预期通过。
- [ ] 提交：`feat(skills): 添加工作流项目级入口`。

### 任务 5：文档与最终验证

**文件：** 修改 `docs/usage.md`；按需补充 `test/installer.test.js`。

- [ ] 说明 Node 20+ 前置条件、完整安装、本地执行、全部 flags 和 `/workflow:*` 映射；明确默认不覆盖已有记录。
- [ ] 运行 `npm test`；预期 0 failures。
- [ ] 运行 `node --check bin/workflow.js`、`node --check lib/installer.js` 与 `git diff --check main...HEAD`；预期均以 0 退出。
- [ ] 在临时目录执行 CLI 安装、检查、默认重装和卸载，确认无用户记录被覆盖。
- [ ] 提交：`docs(工作流): 补充安装与 Skills 使用说明`。

## 计划自检

- CLI、Skills、安全边界、测试和文档分别有明确任务。
- 每一项实现均要求先观察失败测试，再最小实现并观察通过结果。
- 未引入 SpecPilot 路径、全局配置、远程服务或第三方依赖。
- 最终验证覆盖安装、保留、覆盖、检查、卸载、CLI 和 ESM 语法。
