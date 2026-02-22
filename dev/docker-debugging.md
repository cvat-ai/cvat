# CVAT Docker Debugging Guide (Server + Workers)

This guide describes the Docker-first debugging workflow added in this repo:

- source code is edited locally
- CVAT runs in Docker
- VS Code attaches to debugpy in containers

## Prerequisites

1. Docker Desktop is installed and running.
2. VS Code is installed.
3. VS Code extensions:
   - Python (`ms-python.python`)
   - JavaScript Debugger (usually built-in)
4. `code` CLI is optional (used by `./dev/debug.sh vscode`).

## Files used by this workflow

- `docker-compose.yml`
- `docker-compose.dev.yml`
- `dev/docker-compose.debug.yml`
- `.vscode/launch.json`
- `.vscode/tasks.json`
- `dev/debug.sh`

## 1. Build server image with debug tooling

Run from repo root:

```bash
./dev/debug.sh build-server
```

`dev/docker-compose.debug.yml` sets `CVAT_DEBUG_ENABLED=yes` build args for `cvat_server`, so `debugpy` is installed during build.

## 2. Start CVAT and workers

```bash
./dev/debug.sh up-workers
```

This starts the core stack and worker profile.  
UI is available at:

```text
http://localhost:8080
```

## 3. Create admin user (first run)

```bash
./dev/debug.sh createsuperuser
```

## 4. Start debugging from VS Code

1. Open the repository in VS Code.
2. Go to Run and Debug.
3. Start:
   - `docker: attach backend debug`

This compound attaches to:
- `docker: attach server` (9090)
- `docker: attach worker annotation` (9091)
- `docker: attach worker export` (9092)
- `docker: attach worker import` (9093)
- `docker: attach worker quality reports` (9094)
- `docker: attach worker consensus` (9096)

## 5. Daily edit/debug loop

1. Edit Python code locally (bind-mounted into containers).
2. Restart only what changed:

```bash
./dev/debug.sh restart-server
```

or:

```bash
./dev/debug.sh restart-worker cvat_worker_import
```

3. Re-run the same VS Code attach config if needed.

## Useful commands

```bash
./dev/debug.sh logs
./dev/debug.sh logs cvat_server
./dev/debug.sh ps
./dev/debug.sh down
./dev/debug.sh down-v
```

## Troubleshooting

### Docker daemon not running

If you get `Cannot connect to the Docker daemon ... docker.sock`, start Docker Desktop and wait until engine is healthy.

### `ModuleNotFoundError: No module named 'debugpy'`

Rebuild the server image and recreate container:

```bash
./dev/debug.sh build-server
./dev/debug.sh up-workers
```

### Breakpoints not hit

1. Confirm container is running:

```bash
./dev/debug.sh ps
```

2. Confirm debug port is reachable (example: server 9090).
3. Restart the relevant service and re-attach.
