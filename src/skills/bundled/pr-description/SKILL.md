---
name: pr-description
description: Draft a pull request description from current branch changes
---
Draft a pull request description for the current branch. Additional context from the user: $ARGUMENTS

Steps:
1. Run `git log --oneline main..HEAD` (fall back to `master` if `main` does not exist) to list branch commits.
2. Run `git diff main...HEAD --stat` for the change summary.
3. Inspect the most significant diffs where the intent is unclear.
4. Write the description with sections: Summary (2-4 bullet points), Changes (grouped by area), Test plan (checklist).

Output only the finished pull request description in markdown.
