# CLI/SDK Persistent Authentication — Refined Task Breakdown

**Date:** 2026-06-07  
**Based on:** CLI_SDK_persistent_authentication_implementation_plan.md  
**Goal:** Decompose the 5 original tasks into 6 deliverables of ≤2 focused work days each.

---

## Context

The original implementation plan has 5 tasks. Tasks 2 (SDK client helpers) and 4 (CLI auth command group) are each ~3–4 days of work and need splitting. Tasks 1, 3, and 5 are well-scoped. This breakdown keeps tests inside each task and maintains strict sequential ordering (each task depends on the previous).

Codebase reference points:
- CLI entry: `cvat-cli/src/cvat_cli/__main__.py`, `_internal/common.py`
- SDK core: `cvat-sdk/cvat_sdk/core/client.py`, `cvat-sdk/cvat_sdk/core/__init__.py`
- CLI tests: `tests/python/cli/test_cli_misc.py`, `util.py`
- SDK tests: `tests/python/sdk/test_client.py`, `fixtures.py`

---

## Tasks

### Task 1 — AuthStore module (~1.5 days)

**Scope:** Create the persistent auth storage layer in the SDK. Nothing else touches this in later tasks — they import it.

**Deliverables:**
- New file: `cvat-sdk/cvat_sdk/core/auth_store.py`
- `AuthStore` class with:
  - `list(host)` → list of `(auth_id, is_default)` tuples
  - `get(host, auth_id)` → auth entry dict or None
  - `add(host, auth_id, entry)` / `update(host, auth_id, entry)` → upsert
  - `remove(host, auth_id)` → removes entry; cleans empty host records; updates default deterministically
  - `get_default(host)` → auth_id str or None
  - `set_default(host, auth_id)` → validates auth_id exists first
- `get_profile_dir()` → `platformdirs.user_data_path("cvat", "CVAT.ai")`
- `get_auth_file()` → profile dir / `auth.json`
- Permission helpers: create dir with 0700, file with 0600; raise `StoragePermissionError` if existing path has broader permissions
- Atomic write: write to temp file → chmod 0600 → `os.replace()`
- Host normalization: strip trailing slashes, lowercase scheme+host, keep explicit non-default ports
- JSON schema (version 1):
  ```json
  {
    "version": 1,
    "hosts": {
      "https://app.cvat.ai": {
        "default": "work-token",
        "authentications": {
          "work-token": {
            "type": "access_token",
            "token": "...",
            "server_token_id": 123,
            "owner_username": "user",
            "updated_date": "2026-06-07T00:00:00Z"
          }
        }
      }
    }
  }
  ```

**Tests (unit, no server required):**
- Full CRUD cycle: add → get → list → remove
- Default management: auto-default on first add, explicit set_default, remove default shifts to remaining or clears
- Permission rejection: existing file with 0644 raises StoragePermissionError; 0600 is accepted
- Atomic write: temp file does not linger on success or failure
- Malformed JSON: raises clear parse error, does not write
- Unsupported version: raises clear version error
- Host normalization: `https://app.cvat.ai/` == `https://app.cvat.ai`; port 443 on https stripped; port 8080 kept

**Key constraint:** No CLI or network code. Pure file I/O + data management.

---

### Task 2 — SDK client factory helpers (~2 days)

**Scope:** Add the three new SDK public functions and wire them to AuthStore. Preserve `make_client()` behavior exactly.

**Deliverables:**
- Refactor host/port URL construction from `make_client()` into a private `_build_host_url(host, port, insecure)` helper in `cvat-sdk/cvat_sdk/core/helpers.py` (or `client.py` — follow existing file conventions)
- `make_client_from_saved_auth(host, *, port=None, auth_id=None, logger=None, config=None) → Client`:
  - Normalizes host via `_build_host_url`
  - Loads default or named PAT from `AuthStore`
  - Creates `Client`, calls `client.login(AccessTokenCredentials(token))`
  - Raises `AuthNotFoundError` if no matching entry
- `add_cli_parser_args(parser: ArgumentParser) → None`:
  - Adds `--server-host`, `--server-port`, `--insecure`, `--organization`, `--auth` to parser
  - Identical arg names and defaults to what the CLI currently uses
- `make_client_from_cli(parsed_args, *, logger=None, config=None) → Client`:
  - Constructs host URL from `parsed_args.server_host` + `parsed_args.server_port` + `parsed_args.insecure`
  - Delegates auth resolution to the same 5-level resolver that Task 3 builds in the CLI (extract into shared SDK code or accept a credentials callable)
  - Sets organization slug if `parsed_args.organization` is set
- Export all three functions from `cvat_sdk.core` (`__init__.py`)
- Export `AuthStore`, `get_profile_dir`, `get_auth_file` from `cvat_sdk.core` as well

**Tests:**
- `make_client_from_saved_auth()` uses stored PAT and returns a logged-in client (mock server or real integration)
- `make_client_from_saved_auth()` with named `auth_id` overrides default
- `make_client_from_saved_auth()` raises `AuthNotFoundError` when no entry exists
- `add_cli_parser_args()` produces parseable args with expected defaults
- `make_client_from_cli()` passes `insecure` flag and organization slug through to the client
- `make_client()` still works identically (regression)

**Key constraint:** `make_client_from_cli()` auth resolution must call the same logic as the CLI resolver built in Task 3. To avoid duplication, place the resolver function in the SDK (e.g. `cvat_sdk/core/auth_resolver.py`) during Task 2 so Task 3 imports it rather than re-implementing it. If the resolver needs to live in the CLI for other reasons, accept a credentials factory callable as a parameter to `make_client_from_cli()` instead.

---

### Task 3 — CLI auth precedence resolver (~1.5 days)

**Scope:** Rewire how the CLI resolves credentials in `build_client()`. No new commands. All existing commands must pass their existing tests unchanged.

**Deliverables:**
- Change `--auth` arg in `__main__.py`: store raw string value, not parsed `PasswordCredentials`
- New `_internal/auth_resolver.py` (or extend `common.py`) with `resolve_credentials(args, host) → Credentials`:
  ```
  1. --auth VALUE
       VALUE contains ":"  → PasswordCredentials(user, pass)
       matches saved auth_id for host → AccessTokenCredentials(stored token)
       else → PasswordCredentials(VALUE, PASS env or prompt)
  2. CVAT_AUTH env var
       no ":"  → AccessTokenCredentials; validate + store via AuthStore
       has ":" → PasswordCredentials(user, pass); do not store
  3. CVAT_ACCESS_TOKEN env var → AccessTokenCredentials; do not store (backward compat)
  4. Saved host default → AccessTokenCredentials(AuthStore.get_default(host))
  5. Legacy: getpass.getuser() + PASS env or prompt
  ```
- Update `build_client()` to call `resolve_credentials()`
- `CVAT_AUTH` token path: validate via `retrieve_access_tokens_self()` before storing; use `auth_id` from response `.name` field

**Tests:**
- Each precedence level wins correctly when higher levels are absent
- `--auth work-token` where `work-token` is a saved auth_id → uses stored PAT
- `--auth user:pass` → PasswordCredentials (no storage)
- `CVAT_AUTH=<token>` → stored in AuthStore for the host after validation
- `CVAT_AUTH=user:pass` → PasswordCredentials, nothing written to AuthStore
- `CVAT_ACCESS_TOKEN` → used as PAT, AuthStore not written
- No `--auth`, no env vars, saved default exists → saved default used
- No `--auth`, no env vars, no saved → falls through to legacy prompt
- All existing CLI tests in `test_cli_misc.py`, `test_cli_tasks.py`, `test_cli_projects.py` pass without changes

**Key constraint:** Do not change any command-specific argument or behavior. Only `build_client()` and argument parsing are touched.

---

### Task 4 — `auth login` command (~2 days)

**Scope:** Add the `auth` command group and implement `auth login` only. The other three sub-commands come in Task 5.

**Deliverables:**
- New file: `cvat-cli/src/cvat_cli/_internal/commands_auth.py`
- Register `auth` as a top-level command group in `commands_all.py` alongside `task`, `project`, `function`
- `auth login` sub-command:
  - Positional arg `[TOKEN]` (optional): PAT value
  - `--file PATH`: read token from file (strip whitespace)
  - `--name AUTH_ID`: override the name; default fetched from server via `retrieve_access_tokens_self().name`
  - `--set-default`: mark this auth as the host default
  - If no TOKEN and no `--file`: prompt securely via `getpass.getpass()`
  - Validate token: create `Client` with `AccessTokenCredentials(token)`, call `retrieve_access_tokens_self()`; if auth fails, print error and exit non-zero
  - Store via `AuthStore.add(host, auth_id, entry)` — replace if auth_id already exists for host
  - Auto-default: if this is the first (only) auth for the host, set as default unconditionally; otherwise only set if `--set-default` was passed
  - Print confirmation: `Logged in as <owner_username> (auth id: <auth_id>)`

**Tests:**
- Token from positional arg, `--file`, and prompt (mock `getpass`)
- `--name` overrides server-fetched name
- Auto-default when first auth for host
- `--set-default` sets default when other auths already exist
- Replacing an existing `auth_id` updates the stored token
- Invalid token → non-zero exit, nothing written to AuthStore
- Server error during `retrieve_access_tokens_self()` → non-zero exit with clear message

**Key constraint:** `auth login` must use `resolve_credentials()` logic for the token itself — it does not need `--auth` but does respect `--server-host`/`--server-port`/`--insecure`.

---

### Task 5 — `auth list`, `auth default`, `auth logout` commands (~1.5 days)

**Scope:** Complete the `auth` command group with the remaining three sub-commands.

**Deliverables (all in `commands_auth.py`):**

- `auth list [--all]`:
  - Without `--all`: list auths for the current `--server-host`/`--server-port`
  - With `--all`: list auths for every host in AuthStore
  - Output (one line per auth): `<host>  <auth_id>  <default|->` (tab- or space-aligned)
  - If no auths exist: print nothing, exit 0

- `auth default [AUTH_ID]`:
  - Without arg: print current default `auth_id` to stdout; exit 1 if no default
  - With arg: validate `AUTH_ID` exists for host, then `AuthStore.set_default(host, AUTH_ID)`; exit 1 with message if not found

- `auth logout [AUTH_ID]`:
  - With arg: `AuthStore.remove(host, AUTH_ID)`; exit 1 with message if not found
  - Without arg: remove current default; if no default but exactly one auth exists for host, remove that one; if no auth exists, exit 1
  - After removal: if removed auth was the default and others remain, do not auto-pick new default (leave default unset — user must run `auth default` to set one)
  - Remove empty host records from storage

**Tests:**
- `auth list` shows correct `default` marker; `--all` shows multiple hosts
- `auth list` on host with no auths: exits 0, no output
- `auth default` without arg: prints default or exits 1
- `auth default <id>` with valid id: sets default; with invalid id: exits 1
- `auth logout <id>` removes specific auth; with invalid id: exits 1
- `auth logout` without arg removes default; removes sole auth if no default
- `auth logout` on empty host: exits 1
- After `logout` of default when others remain: `auth default` returns exit 1 (no default)

---

### Task 6 — Docs and integration pass (~1 day)

**Scope:** Update user-facing documentation and run a full integration test pass confirming end-to-end flow.

**Deliverables:**
- Update `cvat-cli/README.md` (or existing CLI docs):
  - New `Authentication` section describing `auth login/list/default/logout`
  - `CVAT_AUTH` env var with format examples
  - Revised auth precedence table
  - Secure storage location described as "platform user data directory" (no hardcoded path)
- Update `cvat-sdk/README.md` (or SDK docs):
  - `make_client_from_cli()` usage example
  - `make_client_from_saved_auth()` usage example
  - `add_cli_parser_args()` usage for external scripts
- Run full test suites:
  - `tests/python/cli/test_cli_misc.py`
  - `tests/python/cli/test_cli_tasks.py`
  - `tests/python/cli/test_cli_projects.py`
  - `tests/python/sdk/test_client.py`
  - All new auth tests added in Tasks 1–5
- Fix any regressions found

---

## Dependency Chain

```
Task 1 (AuthStore)
  └→ Task 2 (SDK helpers — imports AuthStore)
       └→ Task 3 (CLI resolver — imports SDK helpers)
            └→ Task 4 (auth login — imports resolver + AuthStore)
                 └→ Task 5 (auth list/default/logout — same module as Task 4)
                      └→ Task 6 (docs + integration pass)
```

Each task is a standalone PR. No task should be merged if the previous task's PR is not merged.

---

## Out of Scope

- Interactive shell mode (PRD option 1, explicitly rejected)
- Remembering `CVAT_ACCESS_TOKEN` to storage (backward-compat behavior: use but don't persist)
- Server-side changes (the generated SDK already exposes `retrieve_access_tokens_self()`)
- Password storage (only PATs are persisted)
