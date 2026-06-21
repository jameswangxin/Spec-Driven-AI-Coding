# 使用说明

## 这个仓库是什么

本仓库是规格驱动开发的工作流模板源。目标项目初始化后会得到两层结构：

```text
.workflow/        治理层：状态、模板、索引、当前入口、Skill 集成
docs/changes/    业务变更包：每个 REQ 一个目录
docs/specs/      当前生效的领域规范
```

不要复制本仓库根目录，也不要复制 `example/`。

## 用安装器初始化

需要 Node.js 20 或更高版本。在目标项目根目录运行：

```bash
node /path/to/spec-driven-ai-coding/bin/workflow.js
```

它会创建缺失的 `.workflow/` 治理文件、`docs/` 文档骨架，并安装六个项目级 Codex Skills 到 `.codex/skills/`。默认不会覆盖已有变更包或规范。

常用命令：

```bash
# 只安装或更新项目级 Skills
node /path/to/spec-driven-ai-coding/bin/workflow.js --skills-only

# 安装 Claude Code Skills；all 同时安装 Codex 与 Claude Code Skills
node /path/to/spec-driven-ai-coding/bin/workflow.js --target claude
node /path/to/spec-driven-ai-coding/bin/workflow.js --target all --with-claude-md

# 只初始化 .workflow 与 docs 骨架
node /path/to/spec-driven-ai-coding/bin/workflow.js --init-only

# 查看模板、docs 骨架和 Skills 是否完整；存在缺失时退出码为 1
node /path/to/spec-driven-ai-coding/bin/workflow.js --check

# 卸载由安装器管理的模板和 Skills，必须显式确认
node /path/to/spec-driven-ai-coding/bin/workflow.js --uninstall --yes
```

卸载会保留 `docs/changes/REQ-*` 和 `docs/specs/` 中的项目记录，也不会删除非 `workflow-*` 的项目 Skills。

安装器拒绝在用户主目录运行，也会拒绝 `.workflow`、`docs`、`.codex` 或 `.codex/skills` 为符号链接的目标，避免把文件写到项目外。

## Codex Skills

| Skill | 用途 | 主要落点 |
| --- | --- | --- |
| `workflow-new` | 创建下一个变更包 | `docs/changes/REQ-xxxx-title/proposal.md` |
| `workflow-confirm` | 澄清需求并推进为 `accepted` | `proposal.md` |
| `workflow-plan` | 根据风险门控创建设计与任务 | `design.md`、`tasks.md`、`specs/` |
| `workflow-exec` | 按已确认范围实施 | `tasks.md`、`implementation.md` |
| `workflow-check` | 记录验证证据 | `verification.md` |
| `workflow-archive` | 合并规范并归档变更包 | `docs/specs/`、`docs/changes/archive/` |

例如：

```text
/workflow-new 增加报表导出
/workflow-confirm REQ-0001
/workflow-plan REQ-0001
/workflow-exec REQ-0001
```

Skills 在执行前会读取项目地图、流程手册、当前上下文和索引。状态变化必须写入 proposal 的 `history`，并同步更新索引或活动入口。

Claude Code 使用 `.claude/skills/workflow-*/SKILL.md` 加载同一套入口。`--with-claude-md` 只在根目录尚无 `CLAUDE.md` 时创建最小引导；已有文件保持不变。

## 手动初始化目标项目

如果运行环境没有 Node.js，也可以手动组装模板：

```bash
mkdir -p .workflow/templates .workflow/checks .workflow/schema .workflow/integrations docs/changes docs/changes/archive docs/specs
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/scaffold/ .workflow/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/document-templates/ .workflow/templates/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/checks/ .workflow/checks/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/governance/schema/ .workflow/schema/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/workflow/integrations/ .workflow/integrations/
rsync -av --exclude='.DS_Store' /path/to/spec-driven-ai-coding/template/docs/scaffold/ docs/
```

复制后，目标项目会得到：

```text
.workflow/
  index.md
  current.md
  project.md
  playbook.md
  git.md
  active/
  templates/
  integrations/
  schema/
  checks/

docs/
  changes/
    archive/
  specs/
```

## 创建第一个变更包

初始化后，目标项目应创建自己的 `REQ-0001`：

```text
docs/changes/REQ-0001-short-title/proposal.md
docs/changes/REQ-0001-short-title/design.md
docs/changes/REQ-0001-short-title/tasks.md
docs/changes/REQ-0001-short-title/implementation.md
docs/changes/REQ-0001-short-title/verification.md
docs/changes/REQ-0001-short-title/specs/
```

使用模板：

- `.workflow/templates/proposal.md`
- `.workflow/templates/design.md`
- `.workflow/templates/tasks.md`
- `.workflow/templates/implementation.md`
- `.workflow/templates/verification.md`
- `.workflow/templates/spec.md`

## 外部 Skill

模板包含外部 Skill 适配规则：

- `.workflow/integrations/superpowers.md`
- `.workflow/integrations/trellis.md`

原则：

```text
外部 Skill 提供方法论；
docs/changes/ 和 docs/specs/ 决定业务文档真源；
.workflow/ 决定治理、状态和入口。
```

## 推荐使用顺序

1. 初始化目标项目。
2. 编辑 `.workflow/project.md`，补充目标项目技术栈、模块和约束。
3. 创建 `docs/changes/REQ-0001-short-title/proposal.md`。
4. 如需设计，创建 `design.md` 和 `tasks.md`。
5. 实施后创建或更新 `implementation.md`。
6. 运行验证命令，并把结果写入 `verification.md`。
7. 更新 `.workflow/index.md` 和 `.workflow/current.md`。
8. 归档时合并 `specs/` 到 `docs/specs/`，再移动整个变更包到 `docs/changes/archive/`。

## 并行需求

单需求工作可以使用 `.workflow/current.md`。多个需求并行时，不要反复覆盖 `current.md`，应创建：

```text
.workflow/active/REQ-0001.md
```

active 文件只保存当前工作入口，不替代变更包。

## Git / PR

模板包含最小 Git / PR 约定：

- `.workflow/git.md`

建议分支、commit 和 PR 都引用 `REQ-*`，并将 CI 或本地验证结果写回 `verification.md`。
