---
name: workflow-new
description: Use when a project using .workflow needs a new requirement work item. If the request is ambiguous, elicit and clarify first; if it is already clear, create the draft requirement directly.
---

# Create a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, and inspect existing `REQ-*` files to find the greatest requirement number.

2. **Clarify when needed**
   - If the request is ambiguous, incomplete, or exploratory, use the Superpowers brainstorming discipline to elicit purpose, constraints, success criteria, relevant modules, solution options, trade-offs, open questions, boundaries, edge cases, and risks without inventing decisions.
   - Present explored content for approval before creating the requirement. If the user rejects or requests changes, iterate and keep the work in context.

3. **Create the requirement**
   - Create the next `.workflow/requirements/REQ-xxxx.md` from `.workflow/templates/requirement.md`; if none exists, start at `REQ-0001`. Never overwrite an existing ID.
   - Preserve the request verbatim under **原始需求**. Record scope, rules, boundaries, acceptance criteria, and unanswered questions without inventing decisions. Map brainstorm outputs to the REQ sections required by `.workflow/integrations/superpowers.md`.
   - Set `status: draft`, add an initial history entry, and update dates.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`; if it is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`. Fix validation failures before continuing.
   - Update `.workflow/index.md` with `workflow-template --sync-index`, then point `.workflow/current.md` or create `.workflow/active/REQ-xxxx.md` at the new requirement.

Do not create a plan, implementation record, or code merely because a request was received or an idea was explored. If the next ID, template, or governing files are missing or inconsistent, stop before writing and report the exact gap.
