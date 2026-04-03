# Agents
1. Always check after experiments that there are no extra Docker containers or
   Kubernetes resources left from previous runs unless explicitly requested.
   Allocated Docker resources can affect experiment results.
2. When committing changes to git, use `git commit -F <message-file>` for
   predictable formatting. The commit message must start with a one-line
   summary, followed by a short list of the most important changes and the
   purpose of each change.
3. Commit only staged files. Before committing, confirm that unstaged and
   untracked files are intentionally excluded and are not required for the
   current commit.
4. Before committing, run the relevant formatting and lint tools for the changed
   files. Use the same tool set enforced in `.github/workflows/linters.yml`:
   `black`, `isort`, `pylint`, `bandit`, `typos`, `remark`, `eslint`,
   `stylelint`, and `regal` when applicable to the changed files. If a required
   tool is not installed locally, install it first and then run it before
   creating the commit.
