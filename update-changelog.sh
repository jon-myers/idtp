#!/usr/bin/env bash
set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"
CUTOFF_DATE="2025-01-13"          # Only include commits on or after this date
TIMEZONE="America/Los_Angeles"    # Change to your preferred time zone

# 1. Make sure we have a changelog file (so we can overwrite it).
[ -f "$CHANGELOG_FILE" ] || touch "$CHANGELOG_FILE"

# 2. Ensure full git history is available (in case of shallow clone on CI).
git fetch --unshallow 2>/dev/null || true
git fetch --all

# 3. Grab **all** commits since the cutoff date, oldest→newest (so we can reverse later).
ALL_COMMITS="$(git log \
  --since="$CUTOFF_DATE" \
  --pretty=format:"%h|%ad|%s|%an" \
  --date=iso8601 \
  --reverse \
)"

# If no commits found at all (e.g., no commits since cutoff), just write a basic file.
if [ -z "$ALL_COMMITS" ]; then
  echo "# Changelog" > "$CHANGELOG_FILE"
  echo "" >> "$CHANGELOG_FILE"
  echo "_No commits found since $CUTOFF_DATE._" >> "$CHANGELOG_FILE"
  echo "Changelog updated (no commits)."
  exit 0
fi

# 4. Build the changelog in ascending order, grouping by Month-Year
TEMP_CONTENT=""
current_month=""

while IFS='|' read -r hash date subject author; do
  # a) Skip commits by github-actions[bot]
  if [[ "$author" == "github-actions[bot]" ]]; then
    continue
  fi

  # b) Only include Angular-style prefixes (feat:, fix:, docs:, style:, refactor:, perf:, test:, chore:, revert:)
  #    Adjust if you use other scopes like build:, ci:, etc.
  if [[ ! "$subject" =~ ^(feat|fix|docs|style|refactor|perf|test|chore|revert)\: ]]; then
    continue
  fi

  # c) Convert the commit date to a simplified local time (Pacific). Example: 2025-01-14 03:22 PM
  local_date="$(TZ="$TIMEZONE" date -d "$date" "+%Y-%m-%d %I:%M %p" 2>/dev/null || true)"

  # d) Determine the "Month Year" heading (e.g. "January 2025")
  month_year="$(TZ="$TIMEZONE" date -d "$date" "+%B %Y" 2>/dev/null || true)"

  # e) If this commit is in a new month, print a heading
  if [ "$month_year" != "$current_month" ]; then
    TEMP_CONTENT+="\n## $month_year\n"
    current_month="$month_year"
  fi

  # f) Append the line for this commit
  TEMP_CONTENT+="* [${hash}] (${local_date}) ${subject} (${author})\n"

done <<< "$ALL_COMMITS"

# 5. Now TEMP_CONTENT is in ascending order (oldest→newest).  
#    But we want **reverse chronological** (newest→oldest).  
REVERSED_CONTENT="$(echo -e "$TEMP_CONTENT" | tac)"

# 6. Write final output (overwriting the entire CHANGELOG.md)
{
  echo "# Changelog"
  echo ""
  echo -e "$REVERSED_CONTENT"
  echo ""
} > "$CHANGELOG_FILE"

echo "Changelog updated."
