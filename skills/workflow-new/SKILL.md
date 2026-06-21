---
name: workflow-new
description: Use when a project using .workflow needs a new requirement work item. If the request is ambiguous, elicit and clarify first; if it is already clear, create the draft requirement directly.
---

# Create a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Inspect existing `REQ-*` files to find the greatest requirement number.

2. **Clarify when needed**
   - If the user's request is ambiguous, incomplete, or exploratory, use Superpowers brainstorming discipline to elicit and clarify:
     - Record the raw idea, problem statement, or opportunity verbatim as **原始需求**.
     - Explore purpose, constraints, success criteria, and relevant modules.
     - Discuss solution options, trade-offs, and open questions without inventing decisions.
     - Identify boundaries, edge cases, and risks.
   - Present the explored content to the user for approval before creating the requirement file.
   - If the user rejects or requests changes, iterate and keep the work in context.

3. **Create the requirement**
   - Create `.workflow/requirements/REQ-xxxx.md` from `.workflow/templates/requirement.md`.
   - Preserve the user's request verbatim under **原始需求**.
   - Record scope, rules, boundaries, acceptance criteria, and unanswered questions without inventing decisions.
   - Map brainstorm outputs (if any) to REQ sections per the integration rules:
     | Brainstorm output | REQ section |
     | --- | --- |
     | Raw idea / request | **原始需求** |
     | Purpose, constraints, success criteria | **背景与目标** and **验收标准** |
     | Solution options and trade-offs | **需求确认**; complex cases go into the plan's **方案设计** |
     | Boundaries and edge cases | **边界条件** and **测试用例** |
     | User approval result | `history` and **变更记录** |
   - Set `status: draft`, add an initial history entry, and update dates.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If validation fails, fix the records before continuing.
   - Update `.workflow/index.md` with `workflow-template --sync-index`.
   - Point `.workflow/current.md` or create `.workflow/active/REQ-xxxx.md` at the new requirement.

Do not create a plan, implementation record, or code merely because a request was received or an idea was explored.
