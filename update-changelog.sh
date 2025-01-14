#!/usr/bin/env bash
set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"
CUTOFF_DATE="2025-01-13"  # Only include commits on or after this date
TIMEZONE="America/Los_Angeles"  # Set your preferred timezone here

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

# Build the 'git log' command options for commits since the cutoff.
LOG_OPTS=(
  --since="$CUTOFF_DATE"
  --pretty=format:"%h|%ad|%s|%an"
  --date=iso8601
  --reverse
)

if [ -z "$LAST_LOGGED_COMMIT_HASH" ]; then
  # No commits have been logged yet, so we list all from the cutoff date
  NEW_COMMITS=$(git log "${LOG_OPTS[@]}")
else
  # Only commits after the last logged commit (still respecting the cutoff)
  NEW_COMMITS=$(git log "${LAST_LOGGED_COMMIT_HASH}..HEAD" "${LOG_OPTS[@]}")
fi

if [ -z "$NEW_COMMITS" ]; then
  echo "No new commits to append."
  exit 0
fi

##################################################
# Build new changelog content (month-grouped),
# but ultimately show newest -> oldest.
##################################################

TEMP_CONTENT=""        # oldest -> newest (we'll reverse it later)
current_month=""       # track current "Month Year" heading

while IFS='|' read -r hash date subject author; do
  
  # 1) Exclude commits by the GitHub Actions bot
  if [[ "$author" == "github-actions[bot]" ]]; then
    continue
  fi

  # 2) Only include commits whose subject starts with an Angular prefix
  #    e.g. feat:, fix:, docs:, style:, refactor:, perf:, test:, chore:, revert:
  if [[ ! "$subject" =~ ^(feat|fix|docs|style|refactor|perf|test|chore|revert)\: ]]; then
    continue
  fi

  # Convert the commit date to Pacific Time in the format: YYYY-MM-DD hh:mm AM/PM
  # Example: 2025-01-14 03:16 PM
  local_date="$(TZ="$TIMEZONE" date -d "$date" "+%Y-%m-%d %I:%M %p" 2>/dev/null || true)"

  # Build the Month Year heading (e.g., "January 2025")
  month_year="$(TZ="$TIMEZONE" date -d "$date" "+%B %Y" 2>/dev/null || true)"

  # If we've hit a new month, insert a heading
  if [ "$month_year" != "$current_month" ]; then
    TEMP_CONTENT+="\n## $month_year\n"
    current_month="$month_year"
  fi

  # Append this commit line
  TEMP_CONTENT+="* [${hash}] (${local_date}) ${subject} (${author})\n"

done <<< "$NEW_COMMITS"

# Now we have them in ascending order (oldest->newest).
# We want newest->oldest, so let's reverse the lines.
REVERSED_CONTENT="$(echo -e "$TEMP_CONTENT" | tac)"

##################################################
# Prepend the new content at the top of the existing CHANGELOG
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
