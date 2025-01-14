#!/usr/bin/env bash
set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"

# Ensure we have a changelog file (to avoid grep errors)
[ -f "$CHANGELOG_FILE" ] || touch "$CHANGELOG_FILE"

# Ensure full history is available (ignore if it fails, e.g. not shallow)
git fetch --unshallow 2>/dev/null || true
git fetch --all

# Identify last logged commit
LAST_LOGGED_COMMIT_HASH=$(
  grep -oE '^\* \[([0-9a-f]{7})\]' "$CHANGELOG_FILE" \
    | head -1 \
    | sed -E 's/^\* \[([0-9a-f]{7})\].*/\1/' \
    || true
)

# Get new commits
if [ -z "$LAST_LOGGED_COMMIT_HASH" ]; then
  NEW_COMMITS=$(git log --pretty=format:"%h|%ad|%s|%an" --date=iso-local)
else
  NEW_COMMITS=$(git log "${LAST_LOGGED_COMMIT_HASH}..HEAD" --pretty=format:"%h|%ad|%s|%an" --date=iso-local)
fi

if [ -z "$NEW_COMMITS" ]; then
  echo "No new commits to append."
  exit 0
fi

REVERSED=$(echo "$NEW_COMMITS" | tac)

APPEND_CONTENT=""
while IFS='|' read -r hash date subject author; do
  APPEND_CONTENT+="* [${hash}] (${date}) ${subject} (${author})\n"
done <<< "$REVERSED"

# Append at the top
TMP_FILE=$(mktemp)
{
  echo "# Changelog"
  echo ""
  echo -e "$APPEND_CONTENT"
  echo ""
  # Keep old content, but remove the old "# Changelog" heading
  sed '/^# Changelog/d' "$CHANGELOG_FILE"
} > "$TMP_FILE"

mv "$TMP_FILE" "$CHANGELOG_FILE"

echo "Changelog updated."
