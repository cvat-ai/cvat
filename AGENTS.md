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
4. Before committing, run the relevant formatting and lint tools using the same
   repo-level commands and flags enforced in `.github/workflows/linters.yml`.
   Use `black`, `isort`, `pylint`, `bandit`, `typos`, `remark`, `eslint`,
   `stylelint`, and `regal` when they apply to the changed files. Do not rely
   on narrower local approximations if CI runs a broader or stricter command;
   local validation must match repository guidelines and CI behavior. If a
   required tool is not installed locally, install it first and then run the
   exact CI-style command before creating the commit.
