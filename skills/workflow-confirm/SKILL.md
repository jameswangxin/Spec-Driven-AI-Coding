---
name: workflow-confirm
description: Use when a draft .workflow requirement needs clarification, acceptance, or a decision about whether it is ready for planning.
---

# Confirm a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`.
   - Read the target `REQ-*` file.
   - Read any referenced `CAP-*` files.

2. **Assert preconditions**
   - Before changing status, run:
     `workflow-template --assert-status REQ-xxxx --status draft`
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`.

3. **Clarify and confirm**
   - Resolve terms, rules, relevant modules, data flow, permissions, security, consistency, boundaries, and observable acceptance criteria.
   - Put unresolved material questions in **待确认问题** and ask the user. Keep the requirement `draft` until they answer.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`.
   - If validation fails, fix the records before transitioning status.
   - After explicit confirmation, change only `draft -> accepted`; append a dated `history` entry with the confirmation reason, update `updated_at`.
   - Update `.workflow/index.md` and the current/active pointer.

Acceptance means intent and boundaries are understood; it is not authorization to implement.
