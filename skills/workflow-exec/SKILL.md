---
name: workflow-exec
description: Use when a planned .workflow requirement has approved implementation authority and needs scoped code changes plus an implementation record.
---

# Execute a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `REQ-*`, its plan or documented skip, any implementation record, referenced `CAP-*` records, and `.workflow/git.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status planned`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - Confirm explicit implementation authority; if absent, ask and pause. If the assertion fails, stop and route the requirement to `workflow-plan` or `workflow-check` as appropriate.

3. **Perform work**
   - Before editing, restate the accepted scope and validation command(s) from the plan. Make only the smallest changes within that scope; do not alter unrelated configuration or workflow history.
   - If a material design or scope deviation appears, record it and obtain renewed confirmation before continuing.
   - Run relevant validation commands and record actual commands, results, key evidence, non-runs, substitute validation, and residual risks in `.workflow/implementations/REQ-xxxx-implementation.md` using the template.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`; fix validation failures before transitioning status.
   - Transition `planned -> implemented` with a dated history entry, update `updated_at`, run `workflow-template --sync-index`, and update `.workflow/current.md` or the active pointer if needed.

Implementation is not verification: do not set `verified` without the separate check step. If the requirement is not `planned`, implementation authority is absent, or validation evidence cannot be recorded, stop before status promotion and report the blocker.
