---
name: workflow-new
description: Use when a project using .workflow needs a new requirement work item, including a request that is still ambiguous or not yet approved.
---

# Create a workflow requirement

`.workflow/` is the project's only workflow record. Before writing, read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, and `.workflow/index.md`; then inspect related `REQ-*` files.

1. Find the greatest requirement number and create the next `.workflow/requirements/REQ-xxxx.md` from `.workflow/templates/requirement.md`.
2. Preserve the user's request verbatim under **原始需求**. Record known scope, rules, boundaries, acceptance criteria, and unanswered questions without inventing decisions.
3. Set `status: draft`, add an initial history entry, and update dates. If intent is incomplete, ask the blocking questions and stop; do not promote it.
4. Add the requirement to `.workflow/index.md`; point `.workflow/current.md` or a dedicated `.workflow/active/REQ-xxxx.md` at it.

Do not create a plan, implementation record, or code merely because a request was received.
