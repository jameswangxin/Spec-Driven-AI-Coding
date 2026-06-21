---
name: workflow-plan
description: Use when an accepted .workflow requirement needs a technical plan or a documented decision that a plan may be skipped.
---

# Plan a workflow requirement

## Execution contract

You MUST enforce this contract using tools, not just reasoning. Stop and ask the user if any required step fails.

1. **Load context**
   - Read `.workflow/project.md`, `.workflow/playbook.md`, `.workflow/current.md`, `.workflow/index.md`, the target `REQ-*`, and referenced `CAP-*` records.

2. **Assert preconditions**
   - Run `workflow-template --assert-status REQ-xxxx --status accepted`.
   - If `workflow-template` is not installed, use `npx workflow-template` or `node ./node_modules/.bin/workflow-template`. Never move a `draft` requirement to `planned`.

3. **Plan or document skip**
   - A plan is mandatory when complexity is `medium` or `complex`, or `risk_tags` contains `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.
   - For a required plan, create `.workflow/plans/REQ-xxxx-plan.md` from the plan template and map each acceptance criterion to an implementation step or validation method.
   - For an exception, record `plan_required: false` and a specific `plan_reason` in the REQ; do not create a fictional plan.
   - Obtain required user approval for the solution before implementation unless implementation authority already exists.

4. **Validate and sync**
   - After modifying any `.workflow/` file, run `workflow-template --validate`; fix validation failures before transitioning status.
   - Change `accepted -> planned`, append dated history, update `updated_at`, `.workflow/index.md`, and the current/active pointer.

Never bypass the risk gate or move a draft requirement to planned. If the REQ is not `accepted`, an approval is required but absent, or the plan cannot account for a material risk, stop without changing status and state what is missing.
