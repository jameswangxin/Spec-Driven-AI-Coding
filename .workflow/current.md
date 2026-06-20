# Current Workflow Context

## Current Requirement

- Requirement: [REQ-0001](requirements/REQ-0001.md)
- Plan: [REQ-0001 plan](plans/REQ-0001-plan.md)
- Implementation record: [REQ-0001 implementation](implementations/REQ-0001-implementation.md)
- Required capability context: [CAP-0001](capabilities/CAP-0001.md)

## Required Reading Before Coding

1. `.workflow/current.md`
2. `.workflow/requirements/REQ-0001.md`
3. `.workflow/plans/REQ-0001-plan.md`
4. `.workflow/capabilities/CAP-0001.md`

## Allowed Scope

- Create the initial `.workflow/` file protocol.
- Create templates for requirements, plans, implementation records, and capability specs.
- Record verification in `.workflow/implementations/REQ-0001-implementation.md`.

## Out of Scope

- Building a CLI.
- Automating state transitions.
- Integrating GitHub issues, pull requests, or CI.
- Multi-user review and approval workflows.

## Known Risks

- The protocol may become too heavy for personal work if templates include unnecessary fields.
- Manual checks can drift until a future CLI validator exists.

## Required Verification

- Confirm every referenced `REQ-*` and `CAP-*` file exists.
- Confirm templates contain the required sections from the approved design spec.
- Run repository status checks before commit.
