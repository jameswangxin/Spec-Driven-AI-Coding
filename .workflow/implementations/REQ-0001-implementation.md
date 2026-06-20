# REQ-0001 Implementation

## Scope Changed

- `.gitignore`: ignored local macOS metadata.
- `.workflow/index.md`: added workflow overview, requirement status flow, planning rule, and capability index.
- `.workflow/current.md`: added Agent pre-coding context entry point.
- `.workflow/requirements/REQ-0001.md`: recorded the initial workflow requirement.
- `.workflow/plans/REQ-0001-plan.md`: recorded the required plan for medium architecture work.
- `.workflow/capabilities/CAP-0001.md`: recorded the Agent pre-coding context capability.
- `.workflow/implementations/REQ-0001-implementation.md`: recorded implementation scope, verification, risks, and follow-ups.
- `.workflow/templates/*`: added templates for requirements, plans, implementation records, and capabilities.

## Commits / PRs

- commit: pending final verification commit
- PR: not applicable

## Tests

- `test -f .workflow/index.md && test -f .workflow/current.md`: passed
- `test -f .workflow/requirements/REQ-0001.md && test -f .workflow/plans/REQ-0001-plan.md`: passed
- `test -f .workflow/capabilities/CAP-0001.md && test -f .workflow/implementations/REQ-0001-implementation.md`: passed
- `test -f .workflow/templates/requirement.md && test -f .workflow/templates/plan.md && test -f .workflow/templates/implementation.md && test -f .workflow/templates/capability.md`: passed
- `rg -n "REQ-0001|CAP-0001" .workflow/index.md .workflow/current.md .workflow/requirements/REQ-0001.md .workflow/capabilities/CAP-0001.md`: passed

## Risks

- Manual workflow checks can drift until a future validator exists.

## Follow-ups

- Consider a future requirement for a CLI validator after the file protocol is used in real work.
