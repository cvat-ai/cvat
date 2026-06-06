# CLI/SDK Persistent Authentication Implementation Plan

## Summary

Implement persistent PAT authentication shared by CVAT CLI and SDK. Store remembered auth entries in a secure platform-native user data directory, add `cvat-cli auth ...` commands, preserve existing `--auth USER[:PASS]` behavior, and let commands use the saved default auth before falling back to the legacy password prompt.

PRD corrections and locked decisions:
- Use `GET /api/auth/access_tokens/self`, not `/auth/api_tokens/self`.
- Keep the CLI default host as `http://localhost`.
- Use `platformdirs.user_data_path("cvat", "CVAT.ai") / "auth.json"` for storage.
- Keep existing `--auth USER[:PASS]`, `PASS`, and `CVAT_ACCESS_TOKEN` flows working.

## Public Interfaces

- Add SDK storage/auth helpers:
  - `AuthStore`: list, get, add/update, remove, get default, set default.
  - `get_profile_dir()`, `get_auth_file()`, and permission validation helpers.
  - `add_cli_parser_args(parser)`.
  - `make_client_from_cli(parsed_args, *, logger=None, config=None)`.
  - `make_client_from_saved_auth(host, *, port=None, auth_id=None, logger=None, config=None)`.
- Add CLI commands:
  - `cvat-cli auth list [--all]`
  - `cvat-cli auth login [CVAT_ACCESS_TOKEN] [--file PATH] [--name AUTH_ID] [--set-default]`
  - `cvat-cli auth logout [AUTH_ID]`
  - `cvat-cli auth default [AUTH_ID]`
- Add `CVAT_AUTH`:
  - `TOKEN` means direct PAT and should be validated and remembered.
  - `USER:PASS` means direct password credentials and should not be remembered.
- Keep `CVAT_ACCESS_TOKEN` as direct PAT auth for backward compatibility; do not auto-write it to storage.

## Task Breakdown

1. Storage foundation
- Add an SDK module for persistent auth storage.
- Store JSON as versioned data keyed by normalized server host from `Client.api_client.configuration.host`.
- Use schema:
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
            "updated_date": "..."
          }
        }
      }
    }
  }
  ```
- Create parent directory with mode `0700` and file with mode `0600`.
- If an existing file or parent directory has broader permissions, raise a clear storage error and do not read or write it.
- Write atomically via temp file, chmod, then replace.

2. SDK client helpers
- Move common host/port URL construction into reusable SDK code while preserving `make_client()` behavior.
- Implement `make_client_from_saved_auth()` to load the default or named PAT for a normalized host and return a logged-in `Client`.
- Implement `make_client_from_cli()` using standard parsed args: `--server-host`, `--server-port`, `--insecure`, `--organization`, `--auth`.
- Implement `add_cli_parser_args()` with the standard global args needed by external scripts.
- Export the new public helpers from a stable SDK namespace and document imports.

3. CLI auth resolution
- Change CLI parsing so `--auth` stores the raw value, allowing host-aware resolution in `build_client`.
- Auth precedence:
  1. explicit `--auth`
  2. `CVAT_AUTH`
  3. `CVAT_ACCESS_TOKEN`
  4. remembered host default
  5. legacy current-user/PASS/password prompt
- Resolve explicit `--auth VALUE` as:
  - `VALUE` containing `:` -> legacy `USER:PASS`
  - exact saved auth id for host -> remembered PAT
  - otherwise -> legacy username with `PASS` or password prompt
- Ensure all existing task/project/function commands use the new resolver without changing their command-specific behavior.

4. CLI `auth` command group
- Register `auth` as a top-level command sibling of `task`, `project`, and `function`.
- `auth login`:
  - Accept token from positional arg, `--file`, or secure prompt.
  - Validate token by logging in with PAT and calling `auth_api.retrieve_access_tokens_self()`.
  - Default `auth_id` to the server token name; allow `--name` override.
  - Add or replace the host/auth_id entry.
  - Make it default when `--set-default` is passed or it is the host’s only auth.
- `auth list`:
  - Current host by default; all hosts with `--all`.
  - Print `<host> <auth_id> <is_default>` lines.
- `auth default`:
  - Without arg, print the current host default or return error code 1.
  - With arg, validate that auth id exists for host and set it as default.
- `auth logout`:
  - With arg, remove that host auth.
  - Without arg, remove the current default; if no default but exactly one host auth exists, remove that one.
  - Remove empty host records and keep/update defaults deterministically.

5. Documentation and plan artifact
- Save this implementation plan as `/Users/andrewstrongin/CVAT/cvat/CLI_SDK_persistent_authentication_implementation_plan.md`.
- Update CLI docs to describe remembered PAT auth, `auth` subcommands, `CVAT_AUTH`, and the revised precedence.
- Update SDK docs to show `make_client_from_cli()` and `make_client_from_saved_auth()`.
- Mention secure storage location generically as “platform user data directory” with examples only if already used in docs style.

## Test Plan

- SDK unit tests:
  - storage read/write/list/default/remove behavior
  - secure permission creation and rejection of insecure existing paths
  - malformed JSON and unsupported schema version errors
  - host normalization with and without explicit port
- SDK integration-style tests:
  - `make_client_from_saved_auth()` logs in with stored PAT
  - `make_client_from_cli()` applies insecure flag and organization slug
- CLI tests:
  - `auth login` from arg, file, and prompt
  - default auth selected automatically for first host auth
  - `auth list`, `auth default`, and `auth logout` outputs/error codes
  - existing `--auth USER[:PASS]`, `PASS`, password prompt, and `CVAT_ACCESS_TOKEN` tests still pass
  - `CVAT_AUTH` raw PAT is validated, remembered, and used
  - command without `--auth` uses remembered default before legacy prompt
- Run targeted suites:
  - `PYTHONPATH=cvat-cli/src:cvat-sdk:tests/python ./.venv/bin/python -m pytest tests/python/cli/test_cli_misc.py --tb=short`
  - `PYTHONPATH=cvat-cli/src:cvat-sdk:tests/python ./.venv/bin/python -m pytest tests/python/sdk/test_client.py --tb=short`
  - Add and run new focused CLI/SDK auth tests.

## Assumptions

- Persistent auth stores only PATs, never passwords.
- Stored auth ids are host-scoped and may repeat across hosts.
- Re-running `auth login` with an existing host/auth_id replaces that entry after successful token validation.
- Insecure existing storage permissions are fatal for persistent auth rather than silently ignored.
- No server-side changes are needed because the generated SDK already exposes `retrieve_access_tokens_self()`.
