#!/usr/bin/env bash
set -euo pipefail

# Static contract checks for the project-local workflow skills. This intentionally
# verifies discoverability and safe minimum structure, not prose style.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
status=0

fail() {
  printf 'FAIL %s: %s\n' "$1" "$2" >&2
  status=1
}

for skill in "$root"/*/SKILL.md; do
  [ -f "$skill" ] || continue
  relative="${skill#"$root"/}"

  if [ "$(sed -n '1p' "$skill")" != '---' ] || ! sed -n '2,80p' "$skill" | grep -qx -- '---'; then
    fail "$relative" 'missing closed YAML frontmatter'
    continue
  fi

  name="$(sed -n '2,80p' "$skill" | sed -n 's/^name: *//p' | head -n 1)"
  description="$(sed -n '2,80p' "$skill" | sed -n 's/^description: *//p' | head -n 1)"

  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || fail "$relative" 'name must be lowercase hyphen-case'
  [[ "$description" == Use\ when* ]] || fail "$relative" 'description must begin with "Use when"'
  grep -q '^# ' "$skill" || fail "$relative" 'missing a top-level Markdown heading'

  if [[ "$relative" == workflow-*/* ]]; then
    grep -q '\.workflow/project\.md' "$skill" || fail "$relative" 'must identify .workflow/project.md as governing context'
    grep -qiE 'stop|pause|ask' "$skill" || fail "$relative" 'must state a stop or escalation condition'
  fi
done

if [ "$status" -eq 0 ]; then
  printf 'PASS workflow skill definitions satisfy the static contract.\n'
fi
exit "$status"
