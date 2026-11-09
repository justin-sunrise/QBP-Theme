#!/usr/bin/env bash
# Merge main into the current store branch by hand, keeping the store's own files.
# Use this instead of `git merge main` on a store branch: a plain merge would apply
# template deletions from main (main only holds the clean starter templates).
#
# usage: scripts/merge-main.sh [ref]   (default: origin/main)

set -euo pipefail

REF="${1:-origin/main}"
STORE_PATHS=(templates config/settings_data.json config/markets.json ':(glob)sections/*-group.json')

if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
  echo "Check out a store branch first." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or stash your changes first." >&2
  exit 1
fi

if git merge-base --is-ancestor "$REF" HEAD; then
  echo "Already contains $REF."
  exit 0
fi

git config merge.ours.driver true
before=$(git rev-parse HEAD)
git merge --no-ff --no-commit "$REF" || true

# Keep the store's copy of every per-store file it already has.
# New files added on main (e.g. a new template) are kept.
for path in "${STORE_PATHS[@]}"; do
  git checkout "$before" -- "$path" 2>/dev/null || true
done

if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
  echo
  echo "Conflicts remain in shared code. Fix these files, then: git add <files> && git commit"
  git diff --name-only --diff-filter=U
  exit 1
fi

git commit --no-edit -m "Merge $REF into $(git rev-parse --abbrev-ref HEAD)"
echo "Merged $REF. Review, then push."
