---
name: workflow-new
description: Use when a project using .workflow needs a new requirement work item, including a request that is still ambiguous or not yet approved.
---

# Create a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Inspect existing `REQ-*` files to find the greatest requirement number.

2. **Create the requirement**
   - Create `.workflow/requirements/REQ-xxxx.md` from `.workflow/templates/requirement.md`.
   - Preserve the user's request verbatim under **原始需求**.
   - Record scope, rules, boundaries, acceptance criteria, and unanswered questions without inventing decisions.
   - Set `status: draft`, add an initial history entry, and update dates.

3. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If validation fails, fix the records before continuing.
   - Update `.workflow/index.md` with `workflow-template --sync-index`.
   - Point `.workflow/current.md` or create `.workflow/active/REQ-xxxx.md` at the new requirement.

Do not create a plan, implementation record, or code merely because a request was received.
