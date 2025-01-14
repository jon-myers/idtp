#!/usr/bin/env bash
set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"

# 1. Ensure we have the entire git history
git fetch --unshallow 2>/dev/null || true
git fetch --all

# 2. Find the last commit hash that appears in CHANGELOG.md
#    We'll look for lines matching our desired "short-hash" format.
LAST_LOGGED_COMMIT_HASH=$(grep -oE '^\* \[([0-9a-f]{7})\]' "${CHANGELOG_FILE}" \
    | head -1 \
    | sed -E 's/^\* \[([0-9a-f]{7})\].*/\1/')

# 3. Build a list of new commits (newest first).
#    --reverse flips it so we list oldest first, then we can reverse again. (Optional preference)
if [ -z "$LAST_LOGGED_COMMIT_HASH" ]; then
  # If no commits are logged yet, list all commits
  NEW_COMMITS=$(git log --pretty=format:"%h|%ad|%s|%an" --date=iso-local)
else
  # List only commits that occurred AFTER the last logged commit
  NEW_COMMITS=$(git log "${LAST_LOGGED_COMMIT_HASH}..HEAD" --pretty=format:"%h|%ad|%s|%an" --date=iso-local)
fi

# 4. If there are no new commits, exit gracefully
if [ -z "$NEW_COMMITS" ]; then
  echo "No new commits to append to CHANGELOG.md"
  exit 0
fi

# 5. Reverse the list so oldest new commits come first in the appended text
#    This ensures chronological order (oldest -> newest).
#    (If you prefer newest first, skip the reversing step.)
REVERSED=$(echo "$NEW_COMMITS" | tac)

# 6. Build the text to append
#    Format: `* [short-hash] (YYYY-MM-DD HH:MM:SS) subject (author)`
APPEND_CONTENT=""
while IFS='|' read -r hash date subject author
do
  APPEND_CONTENT+="* [${hash}] (${date}) ${subject} (${author})\n"
done <<< "$REVERSED"

# 7. Append to top of CHANGELOG.md or bottom — your choice.
#    Here, we’ll **append at the top** so the newest commits appear first in the file.
TMP_FILE=$(mktemp)
{
  echo "# Changelog"
  echo ""
  echo -e "$APPEND_CONTENT"
  echo ""
  # Keep old content
  if [ -f "${CHANGELOG_FILE}" ]; then
    cat "${CHANGELOG_FILE}" | sed '/^# Changelog/d'  # remove old heading
  fi
} > "$TMP_FILE"

mv "$TMP_FILE" "$CHANGELOG_FILE"

echo "Changelog updated with new commits."
