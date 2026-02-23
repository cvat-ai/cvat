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
4. `code` CLI is optional (used by `./dev/cvat-debug.sh vscode`).

## Files used by this workflow

- `docker-compose.yml`
- `docker-compose.dev.yml`
- `dev/docker-compose.debug.yml`
- `dev/Dockerfile.server.debug`
- `.vscode/launch.json`
- `.vscode/tasks.json`
- `dev/cvat-debug.sh`

`dev/cvat-debug.sh` enables Compose Bake by default (`COMPOSE_BAKE=true`) to speed up builds when supported.

## 1. Build server image with debug tooling

Run from repo root:

```bash
./dev/cvat-debug.sh build-server
```

This builds `cvat/server:dev-debug` as a lightweight overlay image:
- base: prebuilt `cvat/server:dev`
- extra: `debugpy` only (via `dev/Dockerfile.server.debug`)

This avoids rebuilding the full CVAT image locally.

## 2. Start CVAT and workers

```bash
./dev/cvat-debug.sh up-workers
```

This starts the core stack and worker profile.  
UI is available at:

```text
http://localhost:8080
```

## 3. Create admin user (first run)

```bash
./dev/cvat-debug.sh createsuperuser
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
./dev/cvat-debug.sh restart-server
```

or:

```bash
./dev/cvat-debug.sh restart-worker cvat_worker_import
```

3. Re-run the same VS Code attach config if needed.

## Useful commands

```bash
./dev/cvat-debug.sh logs
./dev/cvat-debug.sh logs cvat_server
./dev/cvat-debug.sh ps
./dev/cvat-debug.sh clean
./dev/cvat-debug.sh distclean
./dev/cvat-debug.sh clobber
```

## Troubleshooting

### Docker daemon not running

If you get `Cannot connect to the Docker daemon ... docker.sock`, start Docker Desktop and wait until engine is healthy.

### `ModuleNotFoundError: No module named 'debugpy'`

Rebuild the server image and recreate container:

```bash
./dev/cvat-debug.sh build-server
./dev/cvat-debug.sh up-workers
```

### Breakpoints not hit

1. Confirm container is running:

```bash
./dev/cvat-debug.sh ps
```

2. Confirm debug port is reachable (example: server 9090).
3. Restart the relevant service and re-attach.

### `distclean` reports "Resource is still in use"

Use aggressive cleanup:

```bash
./dev/cvat-debug.sh clobber
```
