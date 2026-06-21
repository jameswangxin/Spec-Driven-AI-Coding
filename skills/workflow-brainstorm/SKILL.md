---
name: workflow-brainstorm
description: Use when a project using .workflow needs to explore and clarify a new idea, problem, or opportunity before it becomes a formal requirement. Follows Superpowers brainstorming discipline with approval gating.
---

# Brainstorm a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Inspect existing `REQ-*` files to find the greatest requirement number.

2. **Explore and clarify (Superpowers brainstorming discipline)**
   - Elicit the user's raw idea, problem statement, or opportunity. Record it verbatim as **原始需求**.
   - Explore purpose, constraints, success criteria, and relevant modules. Map these to **背景与目标** and **验收标准**.
   - Discuss solution options and trade-offs. Record decisions and open questions in **需求确认**.
   - Identify boundaries, edge cases, and risks. Map these to **边界条件** and **测试用例**.
   - Do NOT invent decisions the user has not approved. Put unresolved material questions in **待确认问题**.

3. **Approval gating**
   - Present the explored content to the user for approval.
   - If the user rejects or requests changes, iterate and keep the work in context.
   - Only proceed to step 4 after explicit user approval.

4. **Create the draft requirement (entry point for `workflow-new`)**
   - This step produces the same outcome as `workflow-new`: a draft `.workflow/requirements/REQ-xxxx.md`.
   - Create `.workflow/requirements/REQ-xxxx.md` from `.workflow/templates/requirement.md`.
   - Preserve the user's request verbatim under **原始需求**.
   - Map brainstorm outputs to REQ sections per the integration rules:
     | 头脑风暴内容 | REQ 落点 |
     | --- | --- |
     | 用户原始想法 | **原始需求** |
     | 目的、约束、成功标准 | **背景与目标** 和 **验收标准** |
     | 方案选择和权衡 | **需求确认**；复杂时进入 plan 的 **方案设计** |
     | 边界和异常 | **边界条件** 和 **测试用例** |
     | 用户批准结果 | `history` 和 **变更记录** |
   - Set `status: draft`, add an initial history entry, and update dates.
   - If the user prefers, you may instead delegate the file creation to `workflow-new` and pass the mapped content as context.

5. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If validation fails, fix the records before continuing.
   - Update `.workflow/index.md` with `workflow-template --sync-index`.
   - Point `.workflow/current.md` or create `.workflow/active/REQ-xxxx.md` at the new requirement.

Do not create a plan, implementation record, or code merely because an idea was brainstormed.
