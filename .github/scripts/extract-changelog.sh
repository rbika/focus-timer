#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: extract-changelog.sh <version> [output-file]" >&2
  exit 1
fi

version="${1#v}"
changelog="${CHANGELOG_PATH:-CHANGELOG.md}"
output="${2:-}"

if [[ ! -f "$changelog" ]]; then
  echo "::error::${changelog} not found" >&2
  exit 1
fi

notes="$(awk -v ver="v${version}" '
  /^## v/ {
    if (found) exit
    if ($2 == ver) found = 1
    next
  }
  found { print }
' "$changelog")"

trimmed="$(printf '%s\n' "$notes" | sed -e '/./,$!d' -e :a -e '/^\s*$/{$d;N;ba' -e '}')"

if [[ -z "${trimmed//[[:space:]]/}" ]]; then
  echo "::error::No CHANGELOG section found for v${version}" >&2
  exit 1
fi

if [[ -n "$output" ]]; then
  printf '%s\n' "$trimmed" > "$output"
else
  printf '%s\n' "$trimmed"
fi
