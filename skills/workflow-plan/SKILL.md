---
name: workflow-plan
description: Use when an accepted docs/changes proposal needs design.md, tasks.md, or a documented decision that design may be skipped.
---

# Plan a workflow change package

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `proposal.md`, and existing `design.md`, `tasks.md`, or `specs/` files in the same change package.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status accepted`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`. Never move a `draft` proposal to `planned`.

3. **Design or document skip**
   - Design and tasks are mandatory when complexity is `medium` or `complex`, or `risk_tags` contains `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.
   - For required design, create `design.md` and `tasks.md` from templates in the same change package. Map each acceptance criterion to an implementation task or validation method.
   - If system behavior changes, create incremental specs under `docs/changes/REQ-xxxx-title/specs/<domain>/spec.md`.
   - For an exception, record `plan_required: false` and a specific `plan_reason` in `proposal.md`; do not create a fictional design.
   - Obtain required user approval for the solution before implementation unless implementation authority already exists.

4. **Validate and sync**
   - Run `workflow-template --validate`; fix validation failures before transitioning status.
   - Change `accepted -> planned`, append dated history, update `updated_at`, run `workflow-template --sync-index`, and update the current/active pointer.

Never bypass the risk gate or move a draft proposal to planned. If approval is absent or the design cannot account for a material risk, stop without changing status and state what is missing.
