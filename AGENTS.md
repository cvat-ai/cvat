# Agents
1. After experiments, check that no extra Docker containers or Kubernetes
   resources were left behind unless explicitly requested.
2. Use `git commit -F <message-file>`. Start with a one-line summary, then list
   the most important changes and their purpose.
3. Commit only staged files. Confirm unstaged and untracked files are
   intentionally excluded.
4. Before committing, run the exact commands and CI-pinned tool versions from
   `.github/workflows/linters.yml` for each affected language/toolchain. If CI
   installs a tool from a pinned spec or requirements file, use the same source
   locally instead of a different version from your virtualenv. If CI runs a
   tool repo-wide, run it repo-wide locally too; do not replace it with
   narrower file-only checks.
