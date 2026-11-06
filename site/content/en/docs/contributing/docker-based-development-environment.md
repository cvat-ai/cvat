---
title: 'Docker-based development environment'
linkTitle: 'Docker-based development environment'
weight: 3
description: 'Run and debug a local CVAT development environment with Docker as the only required runtime dependency.'
---

# Docker-based development environment

This workflow is for developing CVAT without installing Python, Node.js, Yarn,
Redis, PostgreSQL, OPA, ClickHouse, or other CVAT runtime dependencies on the
host. The host only needs Docker with the Compose plugin. Git and VS Code are
useful, but optional.

The entrypoint is:

```bash
./dev/cvat-local.sh <command>
```

The script prints and exposes standard Docker Compose behavior through a small
set of commands. It is intended to be convenient for humans and predictable for
automation or AI agents.

## First-time setup

Check the host:

```bash
./dev/cvat-local.sh doctor
```

Build the local development images, then install UI dependencies into Docker
volumes:

```bash
./dev/cvat-local.sh bootstrap
```

Start the full development stack:

```bash
./dev/cvat-local.sh up-full
```

Open CVAT:

```text
http://localhost:8080
```

Create an admin user on the first run:

```bash
./dev/cvat-local.sh createsuperuser
```

## Daily workflow

For backend-only work:

```bash
./dev/cvat-local.sh up-workers
./dev/cvat-local.sh logs cvat_server
./dev/cvat-local.sh restart server
```

`restart server` restarts only the `uvicorn` process through supervisord. Use a
full container restart when changing image-level, nginx, supervisord, or
environment-sensitive behavior:

```bash
./dev/cvat-local.sh restart server-full
```

For UI work without host Node.js or Yarn:

```bash
./dev/cvat-local.sh up-ui
```

Open the webpack development server:

```text
http://localhost:3000
```

If port `3000` is already busy:

```bash
./dev/cvat-local.sh --ui-port 3001 up-ui
```

To test another CVAT image tag as the base for local debug images:

```bash
./dev/cvat-local.sh --version <tag> bootstrap
```

## Frontend debugging

Start the backend and the containerized webpack development server:

```bash
./dev/cvat-local.sh up-ui
```

Wait until webpack finishes compiling:

```bash
./dev/cvat-local.sh logs cvat_ui_dev
```

The UI is ready when the log contains `compiled successfully`. Peer dependency
warnings from Yarn are expected for the current CVAT dependency tree. The
webpack server proxies API, static, admin, and documentation requests directly
to `cvat-server` on the Docker network, so the browser should use the webpack
port, not the Traefik port.

Open the UI:

```text
http://localhost:3000
```

In VS Code, use the `Docker: Frontend` launch configuration. It runs the
`docker: up ui` task and attaches Chrome to the webpack development server.

If breakpoints stay gray, wait until webpack has compiled successfully, then
restart the `Docker: Frontend` session. The launch configuration maps webpack
source paths such as `webpack://cvat-ui/./src/...` back to the checkout.

If port `3000` is already busy, start the UI on another port:

```bash
./dev/cvat-local.sh --ui-port 3001 up-ui
```

Then open `http://localhost:3001`.

## Backend debugging

Start the backend and worker containers:

```bash
./dev/cvat-local.sh up-workers
```

In VS Code, use the `Docker: Backend` launch configuration to attach to the
server and worker debug ports.

To make backend containers wait for the debugger on startup:

```bash
./dev/cvat-local.sh --wait-debugger up-workers
```

The default backend debug ports are:

- server: `9090`
- annotation worker: `9091`
- export worker: `9092`
- import worker: `9093`
- quality reports worker: `9094`
- chunks worker: `9095`
- consensus worker: `9096`
- webhooks worker: `9097`

## UI checks

Run the standard UI sanity checks:

```bash
./dev/cvat-local.sh check-ui
```

This installs missing UI dependencies into Docker volumes if needed, then runs
`cvat-ui` linting and a production UI build in the Docker UI environment. For
uncommon frontend commands, open the UI shell:

```bash
./dev/cvat-local.sh shell ui
```

## Inspection and escape hatches

Show running services:

```bash
./dev/cvat-local.sh ps
```

Follow logs:

```bash
./dev/cvat-local.sh logs cvat_server
./dev/cvat-local.sh logs cvat_worker_import
```

Open a shell:

```bash
./dev/cvat-local.sh shell server
./dev/cvat-local.sh shell ui
```

Run a command in a running service:

```bash
./dev/cvat-local.sh exec cvat_server -- python manage.py check
```

Inspect the effective Compose configuration:

```bash
./dev/cvat-local.sh compose-config
```

## Cleanup

Stop containers:

```bash
./dev/cvat-local.sh clean
```

Stop containers and remove volumes:

```bash
./dev/cvat-local.sh distclean
```

Use aggressive cleanup only when interrupted Compose runs leave resources stuck:

```bash
./dev/cvat-local.sh clobber
```

## Design notes and tradeoffs

- Source code is bind-mounted, so Python and TypeScript edits are visible inside
  containers without rebuilding images.
- Dependency-heavy UI paths live in Docker named volumes. This keeps the
  checkout clean and lets `distclean` remove dependencies with Compose.
- The UI image is pinned to Node.js 22 to match CI instead of drifting with the
  moving `node:lts` tag.
- The UI container runs as the `node` user from the official Node image
  (`1000:1000`). If your host UID is not `1000`, normal dependency and
  dev-server writes still go to Docker volumes, but files generated directly in
  the bind-mounted source tree may need a manual `chown`.
- Rebuild images after dependency, Dockerfile, supervisord, nginx, or base image
  changes. Restarting is enough for most source-only backend changes.
- Docker Compose Watch is not required for the default workflow. Bind mounts and
  targeted restarts are easier to inspect and debug for CVAT's current backend
  and UI development loops.
