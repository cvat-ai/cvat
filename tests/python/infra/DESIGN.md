# CVAT Pytest Runtime Infrastructure Design

This package owns the pytest runtime used by the Python REST API, SDK, and CLI
tests. Its job is to make a CVAT instance available, restore known test state,
provide fixture-level restore operations, and collect diagnostics.

The current PR implements the local Docker Compose runtime foundation and keeps
the existing kube path as a legacy compatibility layer. The next PRs are expected
to move toward the `tests-infra-kube-stable-v3` prototype, where kube and
parallel execution use the same runtime concepts.

## Current Concepts

`RuntimeMode`

: Normalized lifecycle request: `auto`, `up`, `down`, `reuse`, `restore`, and
  `rebuild`. The public CLI supports both `--infra=<mode>` and short positional
  lifecycle commands.

`RuntimeRequest`

: Immutable parsed request from pytest options and environment-sensitive
  compatibility rules. Runtime code should use this normalized state instead of
  checking raw pytest options repeatedly.

`RuntimeConfig`

: Process-level configuration facade: pytest option registration, default
  values, repository paths, run-prefix validation, request parsing, and helpers
  for backend runtime state.

`RuntimeContext`

: Per-pytest-process runtime context: run id, run artifact directory, runtime
  root, and server URL helpers. It also writes `run-context.json` for a named
  runtime. That file is intentionally present before parallel mode because child
  pytest processes will need to attach their artifacts to the parent run.

`RuntimeStateStore`

: Filesystem state store keyed by `--run-prefix`. It owns the runtime directory,
  `state.json`, and `run-context.json`. It does not know how Docker Compose or
  kube starts CVAT.

`LocalRuntimeConfig`

: Local Docker-backed runtime configuration for one named runtime. It owns the
  Docker Compose project identity, generated compose file paths, host-port state,
  and prefixed container names.

`InstanceConfig`

: Constructor dependency wiring for an `InfraInstance`, such as repository root,
  restore asset directory, readiness timeout, optional compose overrides, and
  local rebuild preference.

`InfraInstance`

: Fixture-facing backend interface. Fixtures call it to restore DB/data/Redis/
  ClickHouse state and execute commands inside CVAT/Redis without knowing the
  backend implementation.

`InfraPytestPlugin`

: Backend pytest hook surface for option registration and pytest lifecycle
  phases. It is intentionally kept even though the current PR only has a local
  implementation; parallel mode needs collection and runtestloop hooks, and kube
  will need backend-specific option/configuration hooks.

`LocalInstance`

: Current Docker Compose implementation of `InfraInstance`. It delegates local
  implementation details to `infra.instances.local`: Docker discovery, compose
  file generation, environment setup, stack compatibility, lifecycle orchestration,
  and cleanup.

## Target Concepts

These concepts are not fully implemented in this PR, but the current naming and
hook points are kept to make the next kube/parallel PRs straightforward.

`KubeRuntimeConfig` (TBD)

: Kube-backed runtime state for one named runtime: namespace/release/profile
  identity, base URL or port-forward state, persisted compatibility metadata,
  and any state needed to reuse or restore a kube runtime.

`KubeInstance` (TBD)

: Kubernetes implementation of `InfraInstance`. It should manage minikube, Helm,
  port forwards, restore helpers, and diagnostics behind the same fixture-facing
  interface as `LocalInstance`.

`RuntimeProfile` (TBD)

: Runtime shape such as `simple`, `standard`, or `full`. Profiles define which
  optional services and background workers a test set requires.

`ParallelInstance` (TBD)

: Parent-process orchestration instance. It does not provide a CVAT target to
  fixtures; it plans lanes, launches child pytest processes, streams events, and
  handles parent-level lifecycle commands.

`ParallelLane` (TBD)

: One concrete child runtime: lane index, profile, run-prefix/project name,
  artifact directory, backend-specific arguments, and persisted backend state.

`ParallelPlatformAdapter` (TBD)

: Backend-specific lane materialization. Local lanes allocate Compose projects
  and host ports; kube lanes will choose kube namespace/release/port-forward
  state explicitly.

## Expected Flows

Single local run:

1. pytest options are parsed into `RuntimeRequest`.
2. `RuntimeContext` creates the run id and artifact directory.
3. `LocalPytestPlugin` configures local runtime environment values before test
   collection so import-time constants see the selected ports.
4. `LocalInstance` writes the named runtime context, persists local runtime
   state, starts/reuses/restores the Docker Compose stack, and exposes fixture
   restore operations through `InfraInstance`.
5. In auto mode, only a stack started by the current session is stopped during
   session cleanup.

Current kube run:

1. The same `RuntimeRequest` and `RuntimeContext` are used.
2. `kube_legacy` handles the existing kube startup and fixture restore behavior.
3. `--infra=reuse` skips destructive kube reseeding and waits for existing
   services. Local-only lifecycle modes remain rejected for kube.

Future parallel run:

1. The parent process creates a plan and lane definitions.
2. A platform adapter persists lane state and writes `run-context.json` for each
   lane runtime.
3. Child pytest processes load the parent run context and create a normal backend
   `InfraInstance`.
4. The parent process coordinates and replays events; it does not expose fixture
   restore or exec capabilities.
