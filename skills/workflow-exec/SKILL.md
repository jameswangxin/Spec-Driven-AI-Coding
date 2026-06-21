---
name: workflow-exec
description: Use when a planned docs/changes proposal has approved implementation authority and needs scoped code changes plus implementation.md.
---

# Execute a workflow change package

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, target `proposal.md`, `design.md`, `tasks.md`, existing `implementation.md`, incremental `specs/`, and `.workflow/git.md`.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status planned`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - Confirm explicit implementation authority; if absent, ask and pause.

3. **Perform work**
   - Before editing code, restate the accepted scope and validation commands from `design.md` and `tasks.md`.
   - Make only the smallest changes within that scope; do not alter unrelated configuration or workflow history.
   - Update completed items in `tasks.md`.
   - If a material design or scope deviation appears, record it and obtain renewed confirmation before continuing.
   - Create or update `implementation.md` using the template. Record actual changed files, deviations, commit/PR information, and any non-run checks. Do not record verification as complete here.

4. **Validate and sync**
   - Run relevant validation commands and record preliminary evidence in `implementation.md`.
   - Run `workflow-template --validate`; fix validation failures before transitioning status.
   - Transition `planned -> implemented` with a dated history entry, update `updated_at`, run `workflow-template --sync-index`, and update current/active pointer if needed.

Implementation is not verification: do not set `verified` without the separate check step. If the proposal is not `planned`, implementation authority is absent, or implementation evidence cannot be recorded, stop before status promotion and report the blocker.
