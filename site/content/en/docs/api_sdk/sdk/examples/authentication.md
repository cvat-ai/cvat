---
title: 'Authenticate a client'
linkTitle: 'Authentication'
weight: 1
description: 'Copy-and-run auth recipes: PAT (recommended), saved profiles, and the CLI-compatible argument set'
---

Three recipes: `auth_token.py` is the recommended PAT path, `auth_profile.py`
signs in from a saved profile with no secret in your code, and `auth_cli.py`
wires up the shared `cvat-cli` argument set (`--server-host`, `--auth`,
`--profile`, ...) so your scripts feel like an extension of the CLI.

## Connect with a Personal Access Token

Opens an authenticated client with a PAT, prints the server version, and prints
who you are — a quick sanity check any script can copy.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL, e.g. `'https://app.cvat.ai'` |
| `--token` | yes | Token created in the CVAT UI (Profile -> Security) |

```bash
python auth_token.py --host 'https://app.cvat.ai' --token '<your token>'
```

### The script

{{< include-code "assets/sdk-examples/auth_token.py" >}}

## Sign in from a saved profile

Uses a saved CLI profile so no secret lives in the code. Create a profile once
with `cvat-cli`; then any script can pick it by name or fall back to the
default profile.

Create a profile once:

```bash
cvat-cli --server-host 'https://app.cvat.ai' profile create --name app --set-default
```

| Flag | Required | Meaning |
| --- | --- | --- |
| `--profile` | no | Name of a saved profile; omit to use the default profile |

```bash
python auth_profile.py --profile app
python auth_profile.py               # uses the default profile
```

### The script

{{< include-code "assets/sdk-examples/auth_profile.py" >}}

## Build a CLI-compatible script

Reuses `cvat-cli`'s shared auth arguments (`--server-host`, `--server-port`,
`--auth`, `--profile`, `--insecure`, `--organization`) with
`configure_client_auth_arguments`, then hands the parsed namespace to
`make_client_from_cli`, which picks the right factory (profile / PAT / password)
from the arguments. This is the go-to pattern when your script should feel like
an extension of `cvat-cli`.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--server-host` | fallback | Server URL when not using a profile |
| `--auth` | fallback | `USER:PASS` (deprecated password sign-in) or `USER` — see `cvat-cli` |
| `--profile` | fallback | Named saved profile; falls back to the default profile if no host/auth |
| `--insecure`, `--organization`, `--server-port` | no | Reused from `cvat-cli`'s shared arg set |

Also honors `CVAT_ACCESS_TOKEN` / `CVAT_PASSWORD` environment variables the same
way `cvat-cli` does.

```bash
python auth_cli.py --profile app
python auth_cli.py --server-host 'https://app.cvat.ai'          # uses CVAT_ACCESS_TOKEN env
python auth_cli.py --server-host 'https://app.cvat.ai' --auth me:secret
```

### The script

{{< include-code "assets/sdk-examples/auth_cli.py" >}}

_Notes:_

- Personal Access Tokens are the recommended path. Password sign-in (via `--auth
  USER:PASS`) is a deprecated fallback that will be removed in a future release.
- Full recipes:
  [`auth_token.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_token.py),
  [`auth_profile.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_profile.py),
  [`auth_cli.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_cli.py).
