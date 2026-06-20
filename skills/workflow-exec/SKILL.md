---
name: workflow-exec
description: Use when a planned .workflow requirement has approved implementation authority and needs scoped code changes plus an implementation record.
---

# Execute a workflow requirement

Before code changes, read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the `REQ-*`, its plan or documented skip, related `CAP-*`, and `.workflow/git.md`. Confirm explicit implementation authority; if absent, ask and pause.

1. Make only the smallest changes within the accepted requirement and plan. Do not alter unrelated configuration or workflow history.
2. If a material design or scope deviation appears, record it and obtain renewed confirmation before continuing.
3. Run the relevant validation commands. Record the actual commands, results, key evidence, non-runs, substitute validation, and residual risks in `.workflow/implementations/REQ-xxxx-implementation.md` using the template.
4. Update links/pointers and transition `planned -> implemented` with a dated history entry. Update `.workflow/index.md`.

Implementation is not verification: do not set `verified` without the separate check step.
