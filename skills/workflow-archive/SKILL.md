---
name: workflow-archive
description: Use when a verified .workflow requirement is ready to be closed while retaining its requirement, plan, implementation, and decision history.
---

# Archive a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Read the target `REQ-*` file and `.workflow/implementations/REQ-xxxx-implementation.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status verified`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If the requirement is not `verified`, stop and route it to the appropriate workflow step.

3. **Review closure evidence**
   - Confirm the implementation record contains actual validation evidence, residual risks, and follow-up items, and confirm requirement links remain valid.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`; fix validation failures before transitioning status.
   - Change only `verified -> archived`; append a dated history entry including closure reason and any remaining follow-up, and update `updated_at`.
   - Update the row and links in `.workflow/index.md`; remove only the completed requirement's `active/REQ-xxxx.md` pointer and adjust `current.md` if it points there.
   - Re-check that the history transition, index row, and active/current pointers agree.

Never delete REQ, plan, implementation, capability, or history files during archival. Reopening is a separate recorded transition. If status is not `verified` or validation evidence, residual risks, or follow-up items are absent, stop and leave every file unchanged.
