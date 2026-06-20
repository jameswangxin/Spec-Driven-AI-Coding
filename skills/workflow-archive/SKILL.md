---
name: workflow-archive
description: Use when a verified .workflow requirement is ready to be closed while retaining its requirement, plan, implementation, and decision history.
---

# Archive a workflow requirement

Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `REQ-*`, and its implementation record. `.workflow/` remains the unique historical source.

1. Require current status `verified`; otherwise stop and route it to the appropriate workflow step. `implemented` is never sufficient.
2. Confirm the implementation record contains actual validation evidence, residual risks, and follow-up items, and confirm requirement links remain valid.
3. Change only `verified -> archived`; append a dated history entry including closure reason and any remaining follow-up, and update `updated_at`.
4. Update the row and links in `.workflow/index.md`; remove only the completed requirement's `active/REQ-xxxx.md` pointer and adjust `current.md` if it points there.

Never delete REQ, plan, implementation, capability, or history files during archival. Reopening is a separate recorded transition.
