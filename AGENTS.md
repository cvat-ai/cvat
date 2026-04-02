# Agents
1. Always check after experiments that there are no extra Docker containers or Kubernetes resources left from previous runs unless explicitly requested. Allocated Docker resources can affect experiment results.
2. When committing changes to git, use `git commit -F <message-file>` for predictable formatting. The commit message must start with a one-line summary, followed by a short list of the most important changes and the purpose of each change.
3. Commit only staged files. Before committing, confirm that unstaged and untracked files are intentionally excluded and are not required for the current commit.
