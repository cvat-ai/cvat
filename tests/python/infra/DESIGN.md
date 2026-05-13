# CVAT Pytest Runtime Infrastructure Design

This package owns the pytest runtime used by the Python REST API, SDK, and CLI
tests. Its main job is to make a CVAT instance available to tests, restore the
known test state, and collect enough diagnostics when something fails.

## Core Concepts

`Runtime*` classes describe one pytest process and the user's requested runtime
lifecycle. They should not know Docker Compose or Kubernetes details.

`Infra*` classes describe a backend that can provide a CVAT test target. Tests
and fixtures should interact with an `InfraInstance`, not with Docker or
Kubernetes helpers directly.

Backend-specific classes describe how a backend materializes a target. Local
runtime uses Docker Compose project names and generated compose files. Kube
runtime uses minikube profile, namespace, Helm releases, and deployment
fingerprints. These are not shared runtime concepts.

Parallel mode is orchestration. The parent process schedules work and starts
child pytest processes. Each child process creates a normal backend
`InfraInstance`; the parent itself is not a CVAT test target.

## Current Classes

`RuntimeMode`

: Normalized lifecycle command: `auto`, `up`, `down`, `reuse`, `restore`, and
  `rebuild`. The public CLI still uses `--infra` and short positional commands,
  but internally this is runtime intent, not an infra backend type.

`RuntimeRequest`

: Immutable result of parsing command-line options and environment-dependent
  compatibility rules. Code after parsing should rely on this state instead of
  repeatedly checking raw pytest options.

`RuntimeConfig`

: Static configuration and parsing helpers: repository paths, default values,
  allowed runtime modes, run prefix validation, and command conflict validation.
  This is a facade for process-wide runtime settings, not a per-runtime state
  object.

`RuntimeContext`

: Per-process runtime context: run id, run artifact directory, runtime root, and
  server URL helpers. It is initialized once during pytest configuration.

`RuntimeNamespace`

: Persistent runtime state keyed by `--run-prefix`. It owns the runtime
  directory, state file, and context file. The state can contain backend-specific
  sections, but the namespace itself does not know how a backend starts CVAT.

`LocalRuntimeConfig`

: Local Docker-backed runtime configuration for one named runtime. It owns the
  Docker Compose project name, generated compose file paths, host port state,
  and prefixed container names. Docker Compose is the current local backend
  mechanism, but tests should treat this object as local runtime configuration.

`InfraInstanceConfig`

: Common dependencies needed to create an infra instance, such as the repository
  root, restore asset directory, readiness timeout, extra compose files, and
  local rebuild preference.

`InfraInstance`

: Fixture-facing backend interface. It starts and finishes the runtime, executes
  commands in CVAT/Redis, copies files into CVAT, restores DB/data/Redis/
  ClickHouse state, and collects logs.

`InfraPlugin`

: Backend pytest integration hook. It registers backend options and can
  participate in pytest configure, collection, and runtestloop phases.

`LocalInstance`

: Current local Docker Compose implementation of `InfraInstance`. It owns the
  local lifecycle for one local runtime and uses `LocalRuntimeConfig` for local
  names, files, ports, and persisted runtime state.

## Planned Classes

`KubeRuntimeConfig` (TBD)

: Kube-backed runtime configuration for one named runtime. It should own the
  kube namespace/release/profile identity, base URL or port-forward state,
  persisted compatibility metadata, and any state needed to reuse or restore a
  kube runtime.

`RuntimeProfile` (TBD)

: Runtime shape used by local and kube backends, for example `simple`,
  `standard`, and `full`. Profiles define which optional services and workers a
  test set needs.

`KubeDeploymentConfig` (TBD)

: Lower-level kube deployment details derived from `KubeRuntimeConfig`: minikube
  profile, Helm release names, image repositories/tags, profile values, and
  deployment fingerprint.

`KubeInstance` (TBD)

: Kubernetes implementation of `InfraInstance`. It should create
  `KubeRuntimeConfig`, derive `KubeDeploymentConfig` from it when needed, then
  manage minikube, Helm, port forwards, restore helpers, and diagnostics.

`ParallelPlan` (TBD)

: Parent-process plan for parallel execution: lane count, lane profiles,
  grouping policy, and whether to prewarm or reuse lanes.

`ParallelRuntimeConfig` (TBD)

: Parent-process runtime configuration for parallel execution. It should own
  lane count, lane naming, profile assignment, reuse policy, and cleanup policy
  before child pytest processes are started.

`ParallelLane` (TBD)

: One concrete execution lane: lane index, runtime profile, namespace name,
  artifact directory, backend arguments, and backend-specific runtime state.

`ParallelCoordinator` (TBD)

: Parent process orchestration for parallel runs. It creates lanes, starts child
  pytest processes, streams child events back into the parent terminal output,
  handles lane failures, and performs best-effort cleanup.

`ParallelPlatformAdapter` (TBD)

: Backend-specific lane materialization. It converts a `ParallelLane` into
  command-line arguments and persisted state for a concrete backend.

`LocalParallelAdapter` (TBD)

: Local adapter that allocates compose project names and host ports for each
  lane.

`KubeParallelAdapter` (TBD)

: Optional future adapter for kube lanes. It should choose a kube strategy
  explicitly instead of reusing Docker Compose naming.

## Expected Flows

Single local run:

1. pytest options are parsed into `RuntimeRequest`.
2. `RuntimeContext` creates the run id and artifact directory.
3. `LocalInstance` creates a `LocalRuntimeConfig` from the runtime namespace.
4. The local stack is started, reused, restored, or stopped according to
   `RuntimeMode`.
5. Fixtures call `InfraInstance` methods to restore state between tests.

Future kube run:

1. The same `RuntimeRequest` and `RuntimeContext` are used.
2. `KubeInstance` creates a `KubeRuntimeConfig` from the request, namespace
   state, and kube options.
3. `KubeRuntimeConfig` derives lower-level `KubeDeploymentConfig` when Helm or
   minikube details are needed.
4. Kube lifecycle code manages minikube, Helm releases, port forwards, restore
   helpers, and diagnostics behind the `InfraInstance` interface.

Future parallel run:

1. The parent process builds a `ParallelRuntimeConfig` and `ParallelPlan`.
2. `ParallelCoordinator` creates `ParallelLane` objects.
3. A platform adapter persists lane state and builds child pytest commands.
4. Each child process loads the parent run context and creates a normal backend
   `InfraInstance`.
5. The parent process only coordinates and replays events; it does not expose
   fixture restore or exec capabilities.
