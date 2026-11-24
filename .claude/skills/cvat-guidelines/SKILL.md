---
name: cvat-guidelines
description: CVAT engineering guidelines for writing and reviewing code. Use before implementing a change, before reporting a change as done, and when reviewing a diff or PR in this repository.
---

1. Read `site/content/en/docs/contributing/engineering-guidelines.md` and `AGENTS.md`
   in full. They are the source of truth; this skill only says how to apply them.

2. When writing code:
   - Read the neighboring code and the existing abstractions before adding anything.
   - Check each factual claim before writing it into code, comments, or docs.

3. When the change is ready, or when reviewing someone else's diff:
   - Review the diff against the merge base with the parent branch. Mention whether
     uncommitted changes exist, and do not review them unless asked.
   - Look at the change as a whole first: purpose, scope, size, commit structure
     (section 9). On a PR already under review, mention size and commit structure once
     as a note, not as a fix request.
   - Then read the diff file by file: the implementation in full; tests and assets may be
     sampled. Check generated files and assets for sanity and security: compare them with
     a regeneration where it is cheap, and look for unexpected content (credentials,
     binaries, unrelated changes). Check that they were regenerated where needed
     (e.g. `cvat/schema.yml`, `cvat/requirements/*.txt`).
   - Verify behavior, not only style: changed signatures against their callers and tests,
     behavior changes against the commit messages and the PR description.
     This finds the most important problems.
   - Run the relevant tests on a clean checkout of the reviewed commit (`git worktree`),
     not on the working tree.
   - Report what you would raise in a human review, most important first, each with
     `path:line`, the problem, and the concrete fix. Mark each one as
     **blocking**, **should fix**, or **nit**. Keep nits few, or skip them.
   - Verify each finding before reporting it. If a finding is inferred and not checked
     (e.g. tests not run), say so.
   - Do not report pre-existing issues the change does not make worse, or formatting
     that linters catch.
