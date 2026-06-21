---
name: workflow-archive
description: Use when a verified docs/changes proposal is ready to close, merge specs, and move the change package to archive.
---

# Archive a workflow change package

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, target `proposal.md`, `design.md`, `tasks.md`, `implementation.md`, `verification.md`, and incremental `specs/`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status verified`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If the proposal is not `verified`, stop and route it to the appropriate workflow step.

3. **Review closure evidence**
   - Confirm `verification.md` contains actual validation evidence, residual risks, and follow-up items.
   - Confirm `tasks.md` has no unexplained incomplete tasks.
   - If incremental specs exist, merge accepted changes into `docs/specs/<domain>/spec.md` before archive.

4. **Validate, move, and sync**
   - Run `workflow-template --validate`; fix validation failures before transitioning status.
   - Change only `verified -> archived`; append a dated history entry including closure reason and any remaining follow-up, and update `updated_at`.
   - Move the whole change package from `docs/changes/REQ-xxxx-title/` to `docs/changes/archive/YYYY-MM-DD-REQ-xxxx-title/`.
   - Run `workflow-template --validate` again, then `workflow-template --sync-index`; remove only the completed requirement's active pointer and adjust `current.md` if it points there.

Never delete proposal, design, tasks, implementation, verification, specs, or history files during archival. Reopening is a separate recorded transition. If validation evidence, residual risks, or follow-up items are absent, stop and leave files unchanged.
