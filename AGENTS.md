# Agents
1. After experiments, check that no extra Docker containers or Kubernetes
   resources were left behind unless explicitly requested.
2. Use `git commit -F <message-file>`. Start with a one-line summary, then list
   the most important changes and their purpose.
3. Commit only staged files. Confirm unstaged and untracked files are
   intentionally excluded.
4. Before committing, run the applicable CI linters and formatters with the
   exact commands from `.github/workflows/linters.yml`. Install missing tools
   first. Do not use narrower local approximations.
