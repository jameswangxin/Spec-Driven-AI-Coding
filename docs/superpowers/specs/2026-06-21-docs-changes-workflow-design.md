# 将需求产物组织为 `docs/changes` 的设计

## 背景

当前工作流把同一需求的文档分别放在 `.workflow/requirements/`、`.workflow/plans/` 和 `.workflow/implementations/`。状态和治理约束完整，但审查一个需求时需要跨多个目录查找。

本项目采用 OpenSpec 的变更包思路，但不实现 OpenSpec 兼容层。业务文档放在项目根目录的 `docs/`，`.workflow/` 只保留 Agent 工作流的治理信息、入口和校验规则。

项目按全新结构处理，不考虑旧目录或历史文档的兼容与迁移。

## 目标

- 让一个需求的全部产物集中在一个可读、可审查的目录。
- 用 `docs/specs/` 维护当前生效的领域行为规范。
- 保留现有 `REQ-*` 编号、状态机、风险门控、验证记录和 Git 追溯能力。
- 让 CLI、Skills 与模板只认可一套业务文档真源。

## 非目标

- 不引入或兼容 OpenSpec 的 CLI、命令名、配置格式。
- 不保留 `.workflow/requirements/`、`plans/`、`implementations/` 或 `capabilities/` 作为兼容路径。
- 不自动推断领域规范内容；归档时由工作流按已确认的增量更新规范。

## 目录与职责

```text
.workflow/
├── index.md
├── current.md
├── active/
├── templates/
├── checks/
├── schema/
├── integrations/
├── orchestration/
├── project.md
└── playbook.md

docs/
├── changes/
│   ├── REQ-0001-short-title/
│   │   ├── proposal.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── implementation.md
│   │   ├── verification.md
│   │   └── specs/
│   │       └── <domain>/spec.md
│   └── archive/
│       └── 2026-06-21-REQ-0001-short-title/
└── specs/
    └── <domain>/spec.md
```

`.workflow/` 是工作流治理层：它提供状态机、模板、校验、Skill 集成、当前工作指针和全局索引。它不再保存业务需求正文。

`docs/changes/` 是变更工作包的唯一真源。目录名必须使用 `REQ-xxxx-title`，其中编号是需求、分支、提交、验证记录和索引的关联键。

`docs/specs/` 是系统当前行为的单一事实来源，按领域而不是按需求编号组织。完成并归档的变更才会更新这里的内容。

## 变更包

每个变更包固定包含以下产物：

| 文件 | 职责 |
| --- | --- |
| `proposal.md` | 保存原始需求、背景、范围、规则、验收标准、风险和状态历史。文件承载 `REQ-*` frontmatter。 |
| `design.md` | 记录技术设计、取舍、数据流、接口影响、兼容性、回滚与测试策略。 |
| `tasks.md` | 记录可勾选的实施任务，并将任务映射到验收标准或验证方式。 |
| `implementation.md` | 记录实际改动范围、与设计的偏差、提交或 PR 信息。 |
| `verification.md` | 记录实际运行的验证命令、结果、未覆盖项、残余风险和后续事项。 |
| `specs/` | 记录对 `docs/specs/` 的新增、修改或删除。纯维护类变更可以没有增量规范。 |

`proposal.md` 的状态机继续使用：

```text
draft -> accepted -> planned -> implemented -> verified -> archived
```

`tasks.md` 反映实施进度，不能替代状态机；`verification.md` 中存在真实验证证据，才允许从 `implemented` 进入 `verified`。

## 工作流映射

| Skill | 读写范围 |
| --- | --- |
| `workflow-new` | 创建 `docs/changes/REQ-xxxx-title/proposal.md`，更新 `.workflow/index.md` 与当前指针。 |
| `workflow-confirm` | 澄清并更新 `proposal.md`，将状态推进至 `accepted`。 |
| `workflow-plan` | 创建 `design.md`、`tasks.md`，必要时创建增量 `specs/`，将状态推进至 `planned`。 |
| `workflow-exec` | 执行已批准任务，更新 `tasks.md` 和 `implementation.md`，将状态推进至 `implemented`。 |
| `workflow-check` | 校验变更包完整性和真实验证证据，写入 `verification.md`，将状态推进至 `verified`。 |
| `workflow-archive` | 将增量规范合并到 `docs/specs/`，把变更包移动至 `docs/changes/archive/`，并将状态推进至 `archived`。 |

`.workflow/index.md` 维护变更目录、状态与长期规范的链接。`.workflow/current.md` 和 `.workflow/active/REQ-xxxx.md` 仅保存指针、分支和必要的验证上下文，不复制变更包内容。

## 归档规则

归档前必须满足：

- `proposal.md` 状态为 `verified`。
- `verification.md` 包含真实命令或明确记录替代验证与残余风险。
- `tasks.md` 的未完成任务已有取消、拆分或后续需求说明。
- 对系统行为有影响的增量规范已合并到 `docs/specs/`。

归档后的变更包整体移动到：

```text
docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/
```

归档包仍保留原始编号和全部证据。`docs/specs/` 只保留归档后仍然生效的行为，不保留变更过程。

## CLI 与校验边界

CLI 的路径模型改为同时管理 `.workflow/` 与 `docs/`：

- 安装器初始化治理文件和 `docs/changes/`、`docs/specs/` 的目录骨架。
- 校验器从 `docs/changes/*/proposal.md` 读取需求状态和 frontmatter。
- 校验器检查变更包文件、状态转换、任务、验证证据、索引链接和归档位置。
- 索引与当前指针命令生成指向 `docs/changes/` 的相对链接。
- 卸载只删除工具创建的治理和空目录，不删除 `docs/changes/` 或 `docs/specs/` 中的项目记录。

模板、Skills、README、使用文档和测试必须统一使用这些路径。任何旧的业务产物目录均不作为输入或输出路径。

## 验收标准

- 新项目初始化后同时拥有 `.workflow/` 治理骨架与 `docs/changes/`、`docs/specs/` 骨架。
- 创建、确认、计划、实施、检查、归档这六个步骤都只读写约定的变更包和治理文件。
- 校验器拒绝缺少必要产物、状态不一致、索引失效或归档位置错误的变更包。
- 一个归档变更的完整审计记录位于单一目录，当前系统行为可从 `docs/specs/` 查看。
- `npm test`、`npm run check` 和 `npm run pack:check` 通过。
