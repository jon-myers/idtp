#!/usr/bin/env bash
set -euo pipefail


SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

# Then build a full absolute path to the changelog file, assuming
# 'src/CHANGELOG.md' is relative to the script's directory.
CHANGELOG_FILE="$SCRIPT_DIR/src/CHANGELOG.md"
CUTOFF_DATE="2025-01-14T16:20:00-08:00"
TIMEZONE="America/Los_Angeles"

[ -f "$CHANGELOG_FILE" ] || touch "$CHANGELOG_FILE"
git fetch --unshallow 2>/dev/null || true
git fetch --all

ALL_COMMITS="$(git log \
  --since="$CUTOFF_DATE" \
  --pretty=format:"%h|%ad|%s|%an" \
  --date=iso8601 \
  --reverse \
)"

if [ -z "$ALL_COMMITS" ]; then
  echo "# Changelog" > "$CHANGELOG_FILE"
  echo "" >> "$CHANGELOG_FILE"
  echo "_No commits found since $CUTOFF_DATE._" >> "$CHANGELOG_FILE"
  echo "Changelog updated (no commits)."
  exit 0
fi

TEMP_CONTENT=""
current_month=""

while IFS='|' read -r hash date subject author; do
  if [[ "$author" == "github-actions[bot]" ]]; then
    continue
  fi

  if [[ ! "$subject" =~ ^(feat|fix|docs|style|refactor|perf|test|chore|revert)\: ]]; then
    continue
  fi

  local_date="$(TZ="$TIMEZONE" date -d "$date" "+%Y-%m-%d %I:%M %p" 2>/dev/null || true)"
  month_year="$(TZ="$TIMEZONE" date -d "$date" "+%B %Y" 2>/dev/null || true)"

  if [ "$month_year" != "$current_month" ]; then
    TEMP_CONTENT+="\n## $month_year\n"
    current_month="$month_year"
  fi

  TEMP_CONTENT+="* [${hash}] (${local_date}) ${subject} (${author})\n"
done <<< "$ALL_COMMITS"

REVERSED_CONTENT="$(echo -e "$TEMP_CONTENT" | tac)"

{
  echo "# Changelog"
  echo ""
  echo -e "$REVERSED_CONTENT"
  echo ""
} > "$CHANGELOG_FILE"

echo "Changelog updated."
