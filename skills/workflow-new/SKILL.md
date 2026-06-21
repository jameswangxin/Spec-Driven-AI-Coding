---
name: workflow-new
description: Use when a project using .workflow needs a new docs/changes requirement work item. If the request is ambiguous, elicit and clarify first; if it is already clear, create the draft proposal directly.
---

# Create a workflow change package

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, and `.workflow/index.md`.
   - Inspect `docs/changes/REQ-*/proposal.md` and `docs/changes/archive/*-REQ-*/proposal.md` to find the greatest requirement number.

2. **Clarify when needed**
   - If the request is ambiguous, incomplete, or exploratory, use the Superpowers brainstorming discipline to elicit purpose, constraints, success criteria, relevant modules, solution options, trade-offs, open questions, boundaries, edge cases, and risks without inventing decisions.
   - Present explored content for approval before creating the proposal. If the user rejects or requests changes, iterate and keep the work in context.

3. **Create the change package**
   - Create the next `docs/changes/REQ-xxxx-short-title/` directory. Never overwrite an existing ID or archived ID.
   - Create `proposal.md` from `.workflow/templates/proposal.md`.
   - Preserve the request verbatim under **原始需求**. Record scope, rules, boundaries, acceptance criteria, and unanswered questions without inventing decisions. Map brainstorm outputs using `.workflow/integrations/superpowers.md`.
   - Set `status: draft`, add an initial history entry, update dates, and leave design/tasks/implementation/verification absent until their stage.

4. **Validate and sync**
   - Run `workflow-template --validate`; if it is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`. Fix validation failures before continuing.
   - Run `workflow-template --sync-index`, then point `.workflow/current.md` or create `.workflow/active/REQ-xxxx.md` at the new proposal.

Do not create design, tasks, implementation, verification, specs, or code merely because a request was received or an idea was explored. If the next ID, template, or governing files are missing or inconsistent, stop before writing and report the exact gap.
