# REQ-0001 Plan

## Goal

Create the initial `.workflow/` file protocol for stable Agent context, traceable requirements, plans, implementation records, and reusable capability specs.

## Non-Goals

- Do not build a CLI.
- Do not automate status transitions.
- Do not integrate GitHub issues, pull requests, or CI.
- Do not add multi-user approval workflow.

## Change Scope

- Add `.workflow/index.md` and `.workflow/current.md`.
- Add `REQ-0001`, its plan, implementation record, and `CAP-0001`.
- Add templates for requirement, plan, implementation, and capability files.
- Add `.gitignore` for local macOS metadata.
  - This keeps local macOS metadata out of the workflow repository while the protocol is being established.

## Design Decisions

- Use a single `.workflow/` directory as the source of truth.
- Use `REQ-0001` style increasing requirement IDs.
- Use separate `CAP-0001` style IDs for reusable capabilities.
- Require plans for `medium`, `complex`, or high-risk requirements.
- Keep templates short so the workflow stays usable for personal development.

## Test Strategy

- Use shell checks to confirm expected files exist.
- Use `rg` checks to confirm required template sections exist.
- Use `git status --short` to confirm only intended files are staged before each commit.

## Risks and Rollback

- Risk: The process may feel heavy for small changes.
  - Mitigation: Allow `simple` low-risk requirements to skip plans with `plan_required: false`.
- Risk: Manual checks may drift.
  - Mitigation: Keep check rules explicit in `index.md` and implementation records until a future CLI exists.
- Rollback: Revert the commits that add `.workflow/` files and `.gitignore`.
