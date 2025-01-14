#!/usr/bin/env bash
set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"
CUTOFF_DATE="2025-01-14"  # Only include commits on or after this date

# Ensure we have a changelog file (to avoid grep errors).
[ -f "$CHANGELOG_FILE" ] || touch "$CHANGELOG_FILE"

# Ensure we have the full commit history (ignore if not a shallow clone).
git fetch --unshallow 2>/dev/null || true
git fetch --all

# Identify the last commit we have logged in CHANGELOG.md
LAST_LOGGED_COMMIT_HASH=$(
  grep -oE '^\* \[([0-9a-f]{7})\]' "$CHANGELOG_FILE" \
    | head -1 \
    | sed -E 's/^\* \[([0-9a-f]{7})\].*/\1/' \
    || true
)

# If we've never logged anything before, we take all commits since CUTOFF_DATE;
# otherwise, we only take commits after the last logged hash (still respecting the cutoff).
if [ -z "$LAST_LOGGED_COMMIT_HASH" ]; then
  NEW_COMMITS=$(git log --since="$CUTOFF_DATE" \
    --pretty=format:"%h|%ad|%s|%an" \
    --date=iso-local \
    --reverse)  
  # --reverse here to get oldest->newest, then we’ll prepend to keep newest at the top.
else
  NEW_COMMITS=$(git log "${LAST_LOGGED_COMMIT_HASH}..HEAD" --since="$CUTOFF_DATE" \
    --pretty=format:"%h|%ad|%s|%an" \
    --date=iso-local \
    --reverse)
fi

if [ -z "$NEW_COMMITS" ]; then
  echo "No new commits to append."
  exit 0
fi

##################################################
# Build new changelog content in *reverse chronological order*
# (newest at the TOP) grouped by Month-Year heading
##################################################

# We'll read the commits oldest->newest, then *prepend* them
# so the final result is newest->oldest.

TEMP_CONTENT=""  # holds the new commits in a month-grouped format, oldest->newest
current_month=""

while IFS='|' read -r hash date subject author; do
  # Example date: 2025-01-14 10:21:15 +0000
  # Extract a "Month Year" heading, e.g., "January 2025"
  month_year=$(date -d "$date" "+%B %Y" 2>/dev/null || true)

  # If we’ve hit a new month, add a heading
  if [ "$month_year" != "$current_month" ]; then
    TEMP_CONTENT+="\n## $month_year\n"
    current_month="$month_year"
  fi

  TEMP_CONTENT+="* [${hash}] (${date}) ${subject} (${author})\n"
done <<< "$NEW_COMMITS"

# Now we have oldest->newest in TEMP_CONTENT. We want newest->oldest.
# We'll reverse that entire block by lines.
REVERSED_CONTENT="$(echo -e "$TEMP_CONTENT" | tac)"

##################################################
# Prepend the REVERSED_CONTENT at the top of the existing CHANGELOG
##################################################
TMP_FILE=$(mktemp)
{
  echo "# Changelog"
  echo ""
  echo -e "$REVERSED_CONTENT"
  echo ""
  # Keep old content, but remove its existing top-level heading
  sed '/^# Changelog/d' "$CHANGELOG_FILE"
} > "$TMP_FILE"

mv "$TMP_FILE" "$CHANGELOG_FILE"

echo "Changelog updated."
