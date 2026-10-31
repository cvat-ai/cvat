# Instructions for AI agents

Before writing or reviewing code in this repository, read
[the engineering guidelines](site/content/en/docs/contributing/engineering-guidelines.md).
They apply to all code here. The rules below are additional, for agents.

## Claim only what you have checked

- Never state a fact about code, libraries, databases, or performance that you have not
  checked in the current session. If you are inferring, say so — in chat as well.
  Unchecked statements never go into code, comments, docs, commit messages, or PR text.
- When asked "why?" about your change, answer with evidence or remove the thing.
  Do not construct a justification after the fact.
- Run what you change where it actually runs (PostgreSQL, both migration directions,
  the required services). Report what you did not run.

## Stay in scope

- Do only what was asked. Ask before changing the design, adding features, or
  reworking code that the task does not require. An ambiguous reply is not approval.
- Before adding code, read the neighboring code, the existing abstractions,
  and the related docs. Update the comments and docs your change makes outdated.
- The diff is against the parent branch. When reworking your own earlier commits on
  the work branch, do not keep compatibility with them, and do not mention them in
  code, comments, docs, or the changelog.
- Comments and docstrings describe the code as it is, not how it was developed
  or why it was changed. That belongs in the commit message.

## Self-review before reporting done

Check the diff against the guidelines, in particular:

- every added line has a reason (no unrequested branches, parameters, fallbacks, dead code);
- the change extends existing abstractions instead of adding parallel ones; if it
  replaces one with a better abstraction, the existing uses are migrated to it
  (or the migration is planned as a follow-up PR);
- every comment and docstring is true and needed;
- enums / named constants instead of raw strings; impossible paths fail loudly,
  following the conventions of the component;
- type hints on added and changed functions;
- tests go through the public API.

## Git

Defaults, unless the user says otherwise:

- Do not push, amend, or force-push unless explicitly asked. Check `HEAD` before amending.
- Do not commit the user's uncommitted work without asking.
- Split commits by logical change: refactoring first, then the feature; generated files
  after the sources.
- Do not rebase a branch whose PR is under review, unless asked.
- For changes or test runs that must not touch the current working tree, use
  a separate `git worktree`.
