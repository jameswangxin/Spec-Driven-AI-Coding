---
name: workflow-exec
description: Use when a planned .workflow requirement has approved implementation authority and needs scoped code changes plus an implementation record.
---

# Execute a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Read the target `REQ-*` file.
   - If a plan exists, read `.workflow/plans/REQ-xxxx-plan.md`.
   - If an implementation record exists, read `.workflow/implementations/REQ-xxxx-implementation.md`.
   - Read any referenced `CAP-*` files.

2. **Assert preconditions**
   - Before making any changes, run:
     `workflow-template --assert-status REQ-xxxx --status planned`
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.
   - If the assertion fails, stop and route the requirement to `workflow-plan` or `workflow-check` as appropriate.

3. **Perform work**
   - Make only the smallest changes within the accepted requirement and plan.
   - If a material design or scope deviation appears, record it and obtain renewed confirmation before continuing.
   - Run relevant validation commands for the code changes.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If validation fails, fix the records before transitioning status.
   - Update `.workflow/implementations/REQ-xxxx-implementation.md` using the template.
   - Transition `planned -> implemented` with a dated history entry, update `updated_at`, and run `workflow-template --sync-index`.
   - Update `.workflow/current.md` or the active pointer if needed.

Implementation is not verification: do not set `verified` without the separate check step.
