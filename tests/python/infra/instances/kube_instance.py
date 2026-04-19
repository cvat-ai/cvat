# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import json
import logging
import os
import re
from contextlib import nullcontext
from json import JSONDecodeError
from pathlib import Path
from subprocess import PIPE, STDOUT, CalledProcessError, Popen
from time import monotonic, sleep
from urllib.parse import urlsplit

import boto3
import pytest
from infra.config import InfraMode, InfraProfile, RuntimeInfraConfig
from infra.db_restore import PsycopgDatabaseRestorer
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.redis_restore import RedisStateRestorer
from infra.rq_cleanup import BackgroundJobCleaner
from infra.system_utils import is_port_free, kubectl_cp, pick_free_port, run_command

from shared.utils.config import ADMIN_PASS, ADMIN_USER

logger = logging.getLogger(__name__)

_DEFAULT_KUBE_PROFILE = "cvat-pytest"
_DEFAULT_KUBE_NAMESPACE = ""
_DEFAULT_KUBE_SERVER_IMAGE = "cvat/server"
_DEFAULT_KUBE_FRONTEND_IMAGE = "cvat/ui"
_DEFAULT_KUBE_IMAGE_TAG = os.environ.get("CVAT_VERSION", "dev")
_DEFAULT_KUBE_CPUS = ""
_DEFAULT_KUBE_MEMORY = ""
_MAX_KUBE_RELEASE_NAME_LEN = 32
_KUBE_SERVER_CONTAINER = "cvat-backend"
_KUBE_FINGERPRINT_VERSION = 2
_KUBE_TEST_RELEASE_SUFFIX = "-test"
_MINIO_SERVICE_SUFFIX = "minio"
_WEBHOOK_RECEIVER_SERVICE_SUFFIX = "webhook-receiver"
_ALLOW_MINIO_CONFIGMAP_SUFFIX = "allow-minio"
_ALLOW_WEBHOOK_RECEIVER_CONFIGMAP_SUFFIX = "allow-webhook-receiver"
_MINIO_ACCESS_KEY = "minio_access_key"
_MINIO_SECRET_KEY = "minio_secret_key"  # nosec
_MINIO_BUCKETS = ("private", "public", "test", "importexportbucket", "backingcs")
_MINIO_CONTENT_BUCKETS = ("private", "public", "test", "importexportbucket")
_KUBE_STATIC_INFRA_IMAGES = (
    "quay.io/minio/minio:RELEASE.2022-09-17T00-09-45Z",
    "public.ecr.aws/docker/library/redis:7.2.11",
    "public.ecr.aws/b8u7h5e8/postgresql:15.2.0-debian-11-r0",
    "public.ecr.aws/b8u7h5e8/clickhouse:23.12.2-debian-11-r0",
    "docker.io/timberio/vector:0.26.0-alpine",
    "docker.io/openpolicyagent/opa:1.12.2",
    "docker.io/library/traefik:v3.6.0",
    "docker.io/grafana/grafana:10.1.5",
    "docker.io/apache/kvrocks:2.12.1",
)
_BACKGROUND_JOB_QUEUES = (
    "import",
    "export",
    "annotation",
    "webhooks",
    "quality_reports",
    "chunks",
    "consensus",
    "cleaning",
    "notifications",
)


def _external_phase(_name: str):
    return nullcontext()


def _kube_cache_dir() -> Path:
    path = RuntimeInfraConfig.get_runtime_root_dir() / "kube-cache"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _kube_profile_cache_file(profile: str) -> Path:
    normalized = re.sub(r"[^a-zA-Z0-9_.-]", "-", profile)
    return _kube_cache_dir() / f"{normalized}.json"


def _load_kube_profile_cache(profile: str) -> dict:
    path = _kube_profile_cache_file(profile)
    if not path.exists():
        return {}
    try:
        with open(path) as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (OSError, JSONDecodeError, TypeError, ValueError):
        return {}


def _save_kube_profile_cache(profile: str, payload: dict) -> None:
    path = _kube_profile_cache_file(profile)
    tmp_path = path.with_suffix(".tmp")
    with open(tmp_path, "w") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
    tmp_path.replace(path)


def _normalize_release_name(value: str, *, max_length: int = _MAX_KUBE_RELEASE_NAME_LEN) -> str:
    candidate = re.sub(r"[^a-z0-9-]", "-", value.lower())
    candidate = re.sub(r"-+", "-", candidate).strip("-")
    if not candidate:
        candidate = "cvat"
    if not candidate[0].isalnum():
        candidate = f"cvat-{candidate}"
    candidate = candidate[:max_length].strip("-")
    return candidate or "cvat"


def _default_release_name(run_prefix: str) -> str:
    if run_prefix == RuntimeInfraConfig.get_default_project_name():
        return "cvat"
    return _normalize_release_name(f"cvat-{run_prefix}")


def _default_namespace(run_prefix: str) -> str:
    return _normalize_release_name(f"cvat-{run_prefix}", max_length=63)


def _kube_profile() -> str:
    return os.environ.get("CVAT_TEST_KUBE_PROFILE", _DEFAULT_KUBE_PROFILE)


def _kube_context() -> str:
    return _kube_profile()


def _kube_namespace() -> str:
    return os.environ.get("CVAT_TEST_KUBE_NAMESPACE") or _DEFAULT_KUBE_NAMESPACE


def _kube_release() -> str:
    return os.environ.get("CVAT_TEST_KUBE_RELEASE", "cvat")


def _kube_test_release() -> str:
    base = _kube_release()
    suffix = _KUBE_TEST_RELEASE_SUFFIX
    max_base_length = max(1, _MAX_KUBE_RELEASE_NAME_LEN - len(suffix))
    return f"{_normalize_release_name(base, max_length=max_base_length)}{suffix}"


def _kube_minio_service() -> str:
    return f"{_kube_test_release()}-{_MINIO_SERVICE_SUFFIX}"


def _kube_webhook_receiver_service() -> str:
    return f"{_kube_test_release()}-{_WEBHOOK_RECEIVER_SERVICE_SUFFIX}"


def _kube_allow_minio_configmap() -> str:
    return f"{_kube_test_release()}-{_ALLOW_MINIO_CONFIGMAP_SUFFIX}"


def _kube_allow_webhook_receiver_configmap() -> str:
    return f"{_kube_test_release()}-{_ALLOW_WEBHOOK_RECEIVER_CONFIGMAP_SUFFIX}"


def _kube_traefik_service() -> str:
    return f"{_kube_release()}-traefik"


def _kube_backend_service() -> str:
    return f"{_kube_release()}-backend-service"


def _append_kube_trace(message: str) -> None:
    try:
        trace_path = RuntimeInfraConfig.get_run_dir() / "kube-up-trace.log"
        trace_path.parent.mkdir(parents=True, exist_ok=True)
        with open(trace_path, "a") as f:
            f.write(message.rstrip() + "\n")
    except Exception:
        logger.debug("Failed to append kube trace", exc_info=True)


def _write_text_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


def _capture_kube_command_output(path: Path, command: list[str]) -> None:
    stdout, stderr = "", ""
    try:
        stdout, stderr = run_command(command, logger=logger)
    except CalledProcessError as ex:
        stdout = ex.stdout or ""
        stderr = ex.stderr or ""
    except Exception as ex:
        stderr = str(ex)

    payload = (stdout or "") + (f"\n{stderr}" if stderr else "")
    _write_text_file(path, payload)


def _collect_kube_logs_for_pod(
    *, pod_name: str, logs_dir: Path, restart_counts: dict[str, int]
) -> None:
    containers: list[str] = []
    for container_name in restart_counts:
        if container_name not in containers:
            containers.append(container_name)
    if not containers:
        containers.append(_KUBE_SERVER_CONTAINER)

    for container_name in containers:
        safe_container_name = re.sub(r"[^a-zA-Z0-9_.-]", "-", container_name)
        _capture_kube_command_output(
            logs_dir / f"{pod_name}-{safe_container_name}.log",
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "logs",
                pod_name,
                "-c",
                container_name,
            ],
        )

        _capture_kube_command_output(
            logs_dir / f"{pod_name}-{safe_container_name}-previous.log",
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "logs",
                pod_name,
                "-c",
                container_name,
                "--previous",
            ],
        )


def _collect_kube_diagnostics(logs_dir: Path) -> None:
    logs_dir.mkdir(parents=True, exist_ok=True)

    _capture_kube_command_output(
        logs_dir / "events.txt",
        [
            "kubectl",
            "--context",
            _kube_context(),
            "--namespace",
            _kube_namespace(),
            "get",
            "events",
            "--sort-by=.metadata.creationTimestamp",
        ],
    )
    _capture_kube_command_output(
        logs_dir / "pods.txt",
        [
            "kubectl",
            "--context",
            _kube_context(),
            "--namespace",
            _kube_namespace(),
            "get",
            "pods",
            "-o",
            "wide",
        ],
    )

    try:
        stdout, _ = run_command(
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "get",
                "pods",
                "-o",
                "json",
            ],
            logger=logger,
        )
        payload = json.loads(stdout)
    except Exception as ex:
        _write_text_file(logs_dir / "pods.json.error.txt", str(ex))
        payload = {"items": []}
    allowed_instances = {_kube_release(), _kube_test_release()}
    for item in payload.get("items", []):
        metadata = item.get("metadata", {})
        labels = metadata.get("labels", {})
        if labels.get("app.kubernetes.io/instance") not in allowed_instances:
            continue

        pod_name = metadata.get("name")
        if not pod_name:
            continue

        status = item.get("status", {})
        restart_counts = {
            status_item.get("name"): int(status_item.get("restartCount", 0))
            for status_item in status.get("containerStatuses", [])
            if status_item.get("name")
        }

        _capture_kube_command_output(
            logs_dir / f"{pod_name}.describe.txt",
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "describe",
                "pod",
                pod_name,
            ],
        )
        _collect_kube_logs_for_pod(
            pod_name=pod_name,
            logs_dir=logs_dir,
            restart_counts=restart_counts,
        )

    trace_path = RuntimeInfraConfig.get_run_dir() / "kube-up-trace.log"
    if trace_path.exists():
        _write_text_file(logs_dir / "kube-up-trace.log", trace_path.read_text())


def _kube_server_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_SERVER_IMAGE", _DEFAULT_KUBE_SERVER_IMAGE)


def _kube_frontend_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_FRONTEND_IMAGE", _DEFAULT_KUBE_FRONTEND_IMAGE)


def _kube_image_tag() -> str:
    return os.environ.get("CVAT_TEST_KUBE_IMAGE_TAG", _DEFAULT_KUBE_IMAGE_TAG)


def _kube_infra_profile() -> str:
    return RuntimeInfraConfig.get_infra_profile()


def _kube_profile_values_file(*, cvat_root_dir: Path, chart_name: str) -> Path:
    return (
        cvat_root_dir / "tests/k8s/profiles" / f"{chart_name}.{_kube_infra_profile()}.values.yaml"
    )


def _sha256_file(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_tree(root: Path) -> str:
    digest = hashlib.sha256()
    if not root.exists():
        return digest.hexdigest()

    for path in sorted(candidate for candidate in root.rglob("*") if candidate.is_file()):
        relative_path = path.relative_to(root).as_posix()
        digest.update(relative_path.encode())
        digest.update(b":")
        digest.update(_sha256_file(path).encode())
        digest.update(b"\n")

    return digest.hexdigest()


def _docker_image_id(image_ref: str) -> str:
    try:
        return run_command(
            ["docker", "image", "inspect", "--format", "{{.Id}}", image_ref],
            logger=logger,
        )[0].strip()
    except Exception:
        # If image metadata is unavailable, keep fingerprint stable but force reconcile
        # once any other meaningful field changes.
        return ""


def _image_ref_candidates(image_ref: str) -> set[str]:
    candidates = {image_ref}

    if "/" not in image_ref.split(":", 1)[0]:
        candidates.add(f"docker.io/library/{image_ref}")
        candidates.add(f"docker.io/{image_ref}")
    else:
        candidates.add(f"docker.io/{image_ref}")

    return candidates


def _minikube_cache_images(profile: str) -> set[str]:
    try:
        stdout, _ = run_command(["minikube", "-p", profile, "cache", "list"], logger=logger)
        return {line.strip() for line in stdout.splitlines() if line.strip()}
    except Exception:
        return set()


def _ensure_static_images_cached(profile: str) -> None:
    cache = _load_kube_profile_cache(profile)
    cache_key = "static_infra_images_cached"
    cached_images = set(cache.get(cache_key, []))
    actual_cached_images = _minikube_cache_images(profile)
    target_images = set(_KUBE_STATIC_INFRA_IMAGES) | {
        f"{_kube_server_image()}:{_kube_image_tag()}",
        f"{_kube_frontend_image()}:{_kube_image_tag()}",
    }
    missing = sorted(target_images - actual_cached_images)

    newly_cached: set[str] = set()
    for image in missing:
        logger.info("Caching static kube infra image for minikube: %s", image)
        try:
            run_command(
                ["minikube", "-p", profile, "cache", "add", image],
                capture_output=False,
                logger=logger,
            )
            newly_cached.add(image)
        except Exception:
            logger.warning("Failed to cache static kube infra image: %s", image, exc_info=True)

    updated_cached_images = actual_cached_images | newly_cached
    if updated_cached_images != cached_images:
        cache[cache_key] = sorted(updated_cached_images)
        _save_kube_profile_cache(profile, cache)


def _helm_dependency_fingerprint(chart_dir: Path) -> str:
    digest = hashlib.sha256()
    for relative_path in ("Chart.yaml", "Chart.lock"):
        path = chart_dir / relative_path
        digest.update(relative_path.encode())
        digest.update(b":")
        digest.update((_sha256_file(path) if path.exists() else "").encode())
        digest.update(b"\n")
    return digest.hexdigest()


def _build_kube_fingerprint(*, cvat_root_dir, cpus: str, memory: str) -> dict:
    chart_dir = cvat_root_dir / "helm-chart"
    test_chart_dir = cvat_root_dir / "tests/k8s/test-chart"
    cvat_values = chart_dir / "cvat.values.yaml"
    test_values = cvat_root_dir / "tests/k8s/cvat.test.values.yaml"
    cvat_profile_values = _kube_profile_values_file(cvat_root_dir=cvat_root_dir, chart_name="cvat")
    chart_yaml = chart_dir / "Chart.yaml"
    chart_lock = chart_dir / "Chart.lock"
    chart_templates = chart_dir / "templates"
    test_chart_yaml = test_chart_dir / "Chart.yaml"
    test_chart_values = test_chart_dir / "values.yaml"
    test_chart_templates = test_chart_dir / "templates"
    test_chart_profile_values = _kube_profile_values_file(
        cvat_root_dir=cvat_root_dir,
        chart_name="test-chart",
    )
    return {
        "version": _KUBE_FINGERPRINT_VERSION,
        "infra_profile": _kube_infra_profile(),
        "profile": _kube_profile(),
        "namespace": _kube_namespace(),
        "release": _kube_release(),
        "server_image": _kube_server_image(),
        "frontend_image": _kube_frontend_image(),
        "image_tag": _kube_image_tag(),
        "helm_dependency_fingerprint": _helm_dependency_fingerprint(chart_dir),
        "cpus": cpus,
        "memory": memory,
        "chart": {
            "cvat.values.yaml": _sha256_file(cvat_values) if cvat_values.exists() else "",
            "tests/k8s/cvat.test.values.yaml": (
                _sha256_file(test_values) if test_values.exists() else ""
            ),
            f"tests/k8s/profiles/cvat.{_kube_infra_profile()}.values.yaml": (
                _sha256_file(cvat_profile_values) if cvat_profile_values.exists() else ""
            ),
            "Chart.yaml": _sha256_file(chart_yaml) if chart_yaml.exists() else "",
            "Chart.lock": _sha256_file(chart_lock) if chart_lock.exists() else "",
            "templates/": _sha256_tree(chart_templates),
            "tests/k8s/test-chart/Chart.yaml": (
                _sha256_file(test_chart_yaml) if test_chart_yaml.exists() else ""
            ),
            "tests/k8s/test-chart/values.yaml": (
                _sha256_file(test_chart_values) if test_chart_values.exists() else ""
            ),
            "tests/k8s/test-chart/templates/": _sha256_tree(test_chart_templates),
            f"tests/k8s/profiles/test-chart.{_kube_infra_profile()}.values.yaml": (
                _sha256_file(test_chart_profile_values)
                if test_chart_profile_values.exists()
                else ""
            ),
        },
    }


def _fingerprints_equal(lhs: dict | None, rhs: dict) -> bool:
    if not lhs:
        return False
    return json.dumps(lhs, sort_keys=True) == json.dumps(rhs, sort_keys=True)


def _fingerprint_diff(lhs: dict | None, rhs: dict) -> dict[str, dict[str, object]]:
    lhs = lhs or {}
    diff: dict[str, dict[str, object]] = {}
    for key in sorted(set(lhs) | set(rhs)):
        if lhs.get(key) != rhs.get(key):
            diff[key] = {"saved": lhs.get(key), "current": rhs.get(key)}
    return diff


def _configure_kube_runtime_env(
    *, project_name: str, base_url: str, minio_endpoint_url: str
) -> None:
    webhook_receiver_url = (
        f"http://{_kube_webhook_receiver_service()}."
        f"{_kube_namespace()}.svc.cluster.local:2020/payload"
    )
    db_minio_endpoint_url = (
        f"http://{_kube_minio_service()}." f"{_kube_namespace()}.svc.cluster.local:9000"
    )
    os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    os.environ["CVAT_BASE_URL"] = base_url
    os.environ["CVAT_MINIO_ENDPOINT_URL"] = minio_endpoint_url
    os.environ["CVAT_TEST_WEBHOOK_RECEIVER_URL"] = webhook_receiver_url
    os.environ["CVAT_TEST_DB_WEBHOOK_RECEIVER_URL"] = webhook_receiver_url
    os.environ["CVAT_TEST_DB_MINIO_ENDPOINT_URL"] = db_minio_endpoint_url

    # shared.utils.config can be imported before session start, refresh constants.
    try:
        import shared.utils.config as config

        config.BASE_URL = base_url
        config.API_URL = base_url + "/api/"
        config.MINIO_ENDPOINT_URL = minio_endpoint_url
    except Exception:
        logger.debug("Failed to refresh shared.utils.config runtime values", exc_info=True)


def _can_reuse_localhost_url(value: str) -> bool:
    # Saved kube runtime state may point at an old localhost port-forward from a previous
    # run. Reusing a dead localhost URL poisons config before the new stack is started.
    try:
        parsed = urlsplit(value)
    except Exception:
        return False

    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1"}:
        return False

    port = parsed.port
    if not port:
        return False

    return not is_port_free(port, logger=logger)


def preconfigure_kube_runtime_env(config) -> None:
    if config.getoption("--platform") != "kube":
        return

    run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(config)
    infra_mode = RuntimeInfraConfig.parse_infra_mode(config.getoption("--infra"))

    release_name = str(config.getoption("--kube-release") or "").strip()
    if not release_name:
        release_name = _default_release_name(run_prefix)
    namespace = str(config.getoption("--kube-namespace") or "").strip()
    if not namespace:
        namespace = _default_namespace(run_prefix)

    os.environ["CVAT_TEST_KUBE_PROFILE"] = str(config.getoption("--kube-profile"))
    os.environ["CVAT_TEST_KUBE_NAMESPACE"] = _normalize_release_name(namespace, max_length=63)
    os.environ["CVAT_TEST_KUBE_RELEASE"] = _normalize_release_name(release_name)
    os.environ["CVAT_TEST_KUBE_SERVER_IMAGE"] = str(config.getoption("--kube-server-image"))
    os.environ["CVAT_TEST_KUBE_FRONTEND_IMAGE"] = str(config.getoption("--kube-frontend-image"))
    os.environ["CVAT_TEST_KUBE_IMAGE_TAG"] = str(config.getoption("--kube-image-tag"))
    os.environ["CVAT_TEST_INFRA_PROFILE"] = str(
        RuntimeInfraConfig.parse_infra_profile(config.getoption("--infra-profile"))
    )

    if infra_mode == InfraMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = run_prefix
        return

    project_cfg = RuntimeInfraConfig.get_project_config(run_prefix)
    state = project_cfg.load_state() or {}
    base_url = str(state.get("base_url") or "")
    minio_endpoint_url = str(state.get("minio_endpoint_url") or "")
    if not _can_reuse_localhost_url(base_url):
        base_url = "http://localhost:8080"
    if not _can_reuse_localhost_url(minio_endpoint_url):
        minio_endpoint_url = "http://localhost:9000"
    _configure_kube_runtime_env(
        project_name=run_prefix,
        base_url=base_url,
        minio_endpoint_url=minio_endpoint_url,
    )


def _kubectl(command: list[str], *, capture_output: bool = True) -> tuple[str, str]:
    cmd = ["kubectl", "--context", _kube_context(), "--namespace", _kube_namespace(), *command]
    return run_command(cmd, capture_output=capture_output, logger=logger)


def _kubectl_root(command: list[str], *, capture_output: bool = True) -> tuple[str, str]:
    cmd = ["kubectl", "--context", _kube_context(), *command]
    return run_command(cmd, capture_output=capture_output, logger=logger)


def _delete_kube_namespace(namespace: str, *, wait_timeout_s: float = 120.0) -> None:
    if namespace == _DEFAULT_KUBE_NAMESPACE:
        return

    # Helm deliberately keeps some PVCs (for example backend-data), which leaves the
    # namespace in Terminating for a long time. Remove PVCs first, then wait for the
    # namespace to disappear so the next run starts from a clean cluster state.
    try:
        run_command(
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                namespace,
                "delete",
                "pvc",
                "--all",
                "--ignore-not-found=true",
                "--wait=false",
            ],
            capture_output=False,
            logger=logger,
        )
    except Exception:
        logger.warning("Failed to delete PVCs in test namespace %s", namespace, exc_info=True)

    run_command(
        [
            "kubectl",
            "--context",
            _kube_context(),
            "delete",
            "namespace",
            namespace,
            "--wait=false",
        ],
        capture_output=False,
        logger=logger,
    )

    deadline = monotonic() + wait_timeout_s
    while monotonic() < deadline:
        try:
            run_command(
                ["kubectl", "--context", _kube_context(), "get", "namespace", namespace],
                logger=logger,
            )
        except Exception:
            return
        sleep(2)

    logger.warning("Timed out waiting for test namespace %s to be deleted", namespace)


def _label_selector(extra: str) -> str:
    return f"app.kubernetes.io/instance={_kube_release()},{extra}"


def _test_label_selector(extra: str) -> str:
    return f"app.kubernetes.io/instance={_kube_test_release()},{extra}"


def kube_get_pod_name(label_filter: str, *, prefer_substring: str | None = None) -> str:
    names = _kubectl(
        [
            "get",
            "pods",
            "-l",
            label_filter,
            "-o",
            "jsonpath={.items[*].metadata.name}",
        ]
    )[0].split()
    if not names:
        raise RuntimeError(f"No pods found for selector: {label_filter}")

    if prefer_substring:
        for name in names:
            if prefer_substring in name:
                return name

    return names[0]


def kube_get_server_pod_name() -> str:
    return kube_get_pod_name(_label_selector("component=server"), prefer_substring="-server-")


def kube_get_db_pod_name() -> str:
    return kube_get_pod_name(_label_selector("app.kubernetes.io/name=postgresql"))


def kube_get_redis_inmem_pod_name() -> str:
    return kube_get_pod_name(
        _label_selector("app.kubernetes.io/name=redis"), prefer_substring="-redis-master-"
    )


def kube_get_redis_ondisk_pod_name() -> str:
    return kube_get_pod_name(_label_selector("app.kubernetes.io/name=cvat,tier=kvrocks"))


def _minikube_profile_exists(profile: str) -> bool:
    try:
        output = run_command(["minikube", "profile", "list", "-o", "json"], logger=logger)[0]
    except Exception:
        return False

    try:
        data = json.loads(output) if output else {}
    except JSONDecodeError:
        return False

    valid = {"Running", "Stopped", "Paused", "Configured", "Starting", "OK"}
    for item in data.get("valid", []):
        if item.get("Name") == profile and item.get("Status") in valid:
            return True
    return False


def _kube_api_reachable(context: str) -> bool:
    try:
        run_command(["kubectl", "--context", context, "get", "--raw=/readyz"], logger=logger)
        return True
    except Exception:
        return False


def _use_minikube_context(profile: str) -> None:
    run_command(["minikube", "-p", profile, "update-context"], capture_output=False, logger=logger)


def _minikube_profile_running(profile: str) -> bool:
    try:
        output, _ = run_command(
            ["minikube", "-p", profile, "status", "-o", "json"],
            logger=logger,
        )
    except Exception:
        return False

    try:
        data = json.loads(output) if output else {}
    except JSONDecodeError:
        return False

    return (
        str(data.get("Host", "")).lower() == "running"
        and str(data.get("APIServer", "")).lower() == "running"
        and str(data.get("Kubelet", "")).lower() == "running"
    )


def _start_minikube(*, profile: str, cpus: str, memory: str) -> bool:
    created = False
    if not _minikube_profile_exists(profile):
        created = True

    if not created and _minikube_profile_running(profile):
        _use_minikube_context(profile)
        if _kube_api_reachable(_kube_context()):
            return False

    command = [
        "minikube",
        "start",
        "-p",
        profile,
        "--driver=docker",
        "--container-runtime=containerd",
        "--wait=apiserver,system_pods,default_sa",
        "--wait-timeout=10m",
        "--auto-pause-interval=24h",
    ]
    if cpus:
        command.append(f"--cpus={cpus}")
    if memory:
        command.append(f"--memory={memory}")

    with _external_phase("kube.minikube_start"):
        _run_with_retries(command, attempts=2, delay_s=10.0)
    _use_minikube_context(profile)
    return created


def _stop_minikube(profile: str) -> None:
    if not _minikube_profile_exists(profile):
        return
    run_command(["minikube", "delete", "-p", profile], capture_output=False, logger=logger)


def _load_images_into_minikube(profile: str) -> None:
    backend_ref = f"{_kube_server_image()}:{_kube_image_tag()}"
    frontend_ref = f"{_kube_frontend_image()}:{_kube_image_tag()}"
    current_images = {
        "server": {"ref": backend_ref, "id": _docker_image_id(backend_ref)},
        "frontend": {"ref": frontend_ref, "id": _docker_image_id(frontend_ref)},
    }
    cache = _load_kube_profile_cache(profile)
    cached_images = cache.get("loaded_images", {})
    try:
        minikube_images_stdout, _ = run_command(
            ["minikube", "-p", profile, "image", "ls"],
            logger=logger,
        )
        minikube_images = {
            line.strip() for line in minikube_images_stdout.splitlines() if line.strip()
        }
    except Exception:
        minikube_images = set()

    for key, image in current_images.items():
        cached = cached_images.get(key, {})
        image_ref_candidates = _image_ref_candidates(image["ref"])
        if (
            cached.get("ref") == image["ref"]
            and cached.get("id") == image["id"]
            and bool(image_ref_candidates & minikube_images)
            and (bool(image["id"]) or not cached.get("id"))
        ):
            logger.info(
                "Skipping minikube image load for %s (profile=%s, image=%s, id matched cache and image exists in node)",
                key,
                profile,
                image["ref"],
            )
            continue

        with _external_phase(f"kube.image_load.{key}"):
            run_command(
                ["minikube", "image", "load", image["ref"], "-p", profile],
                capture_output=False,
                logger=logger,
            )

    cache["loaded_images"] = current_images
    _save_kube_profile_cache(profile, cache)


def _reload_cached_images_into_minikube(profile: str) -> None:
    run_command(
        ["minikube", "-p", profile, "cache", "reload"],
        capture_output=False,
        logger=logger,
    )


def _helm_release_exists(*, release: str, namespace: str) -> bool:
    try:
        run_command(["helm", "status", release, "--namespace", namespace], logger=logger)
        return True
    except Exception:
        return False


def _run_with_retries(command: list[str], *, attempts: int = 4, delay_s: float = 5.0) -> None:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            run_command(command, capture_output=False, logger=logger)
            return
        except Exception as ex:
            last_error = ex
            if attempt >= attempts:
                break
            backoff = delay_s * attempt
            logger.warning(
                "Command failed (attempt %s/%s), retrying in %.1fs: %s",
                attempt,
                attempts,
                backoff,
                " ".join(command),
            )
            sleep(backoff)

    assert last_error is not None
    raise last_error


def _helm_upgrade_install_test_chart(*, cvat_root_dir, release: str, namespace: str) -> None:
    chart_dir = cvat_root_dir / "tests/k8s/test-chart"
    profile_values = _kube_profile_values_file(cvat_root_dir=cvat_root_dir, chart_name="test-chart")
    with _external_phase("kube.helm_test_chart"):
        run_command(
            [
                "helm",
                "upgrade",
                "--install",
                release,
                str(chart_dir),
                "-f",
                str(chart_dir / "values.yaml"),
                "-f",
                str(profile_values),
                "--namespace",
                namespace,
                "--create-namespace",
            ],
            capture_output=False,
            logger=logger,
        )


def _helm_upgrade_install_main_chart(*, cvat_root_dir, release: str, namespace: str) -> None:
    chart_dir = cvat_root_dir / "helm-chart"
    profile_values = _kube_profile_values_file(cvat_root_dir=cvat_root_dir, chart_name="cvat")
    profile = _kube_profile()
    deps_fingerprint = _helm_dependency_fingerprint(chart_dir)
    cache = _load_kube_profile_cache(profile)
    if cache.get("helm_dependency_fingerprint") != deps_fingerprint:
        with _external_phase("kube.helm_dependency_update"):
            _run_with_retries(["helm", "dependency", "update", str(chart_dir)])
        cache["helm_dependency_fingerprint"] = deps_fingerprint
        _save_kube_profile_cache(profile, cache)
    else:
        logger.info(
            "Skipping helm dependency update for profile '%s' (dependency fingerprint matched)",
            profile,
        )

    with _external_phase("kube.helm_main_chart"):
        run_command(
            [
                "helm",
                "upgrade",
                "--install",
                release,
                str(chart_dir),
                "-f",
                str(chart_dir / "cvat.values.yaml"),
                "-f",
                str(cvat_root_dir / "tests/k8s/cvat.test.values.yaml"),
                "-f",
                str(profile_values),
                "--namespace",
                namespace,
                "--create-namespace",
                "--set",
                f"cvat.backend.image={_kube_server_image()}",
                "--set",
                f"cvat.backend.tag={_kube_image_tag()}",
                "--set",
                f"cvat.frontend.image={_kube_frontend_image()}",
                "--set",
                f"cvat.frontend.tag={_kube_image_tag()}",
                "--set",
                "ingress.hostname=localhost",
                "--set",
                "ingress.additionalHosts[0]=127.0.0.1",
                "--set",
                "traefik.service.type=NodePort",
                "--set",
                f"cvat.backend.additionalVolumes[0].configMap.name={_kube_allow_minio_configmap()}",
                "--set",
                f"cvat.backend.additionalVolumes[1].configMap.name={_kube_allow_webhook_receiver_configmap()}",
            ],
            capture_output=False,
            logger=logger,
        )


def _helm_uninstall(*, release: str, namespace: str) -> None:
    if not _helm_release_exists(release=release, namespace=namespace):
        return
    run_command(
        ["helm", "uninstall", release, "--namespace", namespace],
        capture_output=False,
        logger=logger,
    )


def _wait_for_kube_ready(timeout_s: int = 300) -> None:
    with _external_phase("kube.wait_ready"):
        _wait_for_kube_ready_inner(timeout_s=timeout_s)


def _wait_for_kube_ready_inner(timeout_s: int = 300) -> None:
    def wait_selector(selector: str) -> None:
        deadline = monotonic() + timeout_s
        last_error = ""
        selector_timeout_s = max(30, min(timeout_s, 180))
        while monotonic() < deadline:
            names = _kubectl(
                ["get", "pods", "-l", selector, "-o", "jsonpath={.items[*].metadata.name}"]
            )[0].split()
            if not names:
                sleep(2)
                continue

            try:
                _kubectl_root(
                    [
                        "wait",
                        "--namespace",
                        _kube_namespace(),
                        "--for=condition=ready",
                        "pod",
                        "-l",
                        selector,
                        "--timeout",
                        f"{selector_timeout_s}s",
                    ],
                    capture_output=True,
                )
                return
            except Exception as ex:
                last_error = str(ex)
                try:
                    ready_states = _kubectl(
                        [
                            "get",
                            "pods",
                            "-l",
                            selector,
                            "-o",
                            "jsonpath={range .items[*]}{.metadata.name}={range .status.conditions[*]}{.type}:{.status},{end}{' '}{end}",
                        ]
                    )[0].strip()
                    if ready_states and all("Ready:True" in item for item in ready_states.split()):
                        return
                except Exception:
                    pass
                sleep(2)

        raise RuntimeError(
            f"Timed out waiting for selector '{selector}' readiness in namespace '{_kube_namespace()}'. "
            f"Last error: {last_error}"
        )

    def maybe_wait_selector(selector: str) -> None:
        try:
            names = _kubectl(
                ["get", "pods", "-l", selector, "-o", "jsonpath={.items[*].metadata.name}"]
            )[0].split()
        except Exception:
            names = []

        if names:
            wait_selector(selector)

    wait_selector(_label_selector("component=server"))
    wait_selector(_label_selector("app.kubernetes.io/name=postgresql"))
    wait_selector(_label_selector("app.kubernetes.io/name=redis"))
    maybe_wait_selector(_label_selector("app.kubernetes.io/name=cvat,tier=kvrocks"))
    if _kube_service_exists(_kube_minio_service()):
        wait_selector(_test_label_selector("component=minio"))

    required_worker_components = {
        str(InfraProfile.SIMPLE): (
            "component=worker-utils",
            "component=worker-webhooks",
        ),
        str(InfraProfile.STANDARD): (
            "component=worker-utils",
            "component=worker-webhooks",
            "component=worker-import",
            "component=worker-export",
            "component=worker-chunks",
        ),
        str(InfraProfile.FULL): (
            "component=worker-utils",
            "component=worker-webhooks",
            "component=worker-import",
            "component=worker-export",
            "component=worker-chunks",
            "component=worker-annotation",
            "component=worker-qualityreports",
            "component=worker-consensus",
        ),
    }
    for component_selector in required_worker_components.get(_kube_infra_profile(), ()):
        maybe_wait_selector(_label_selector(component_selector))


def _kube_service_exists(service_name: str) -> bool:
    try:
        _kubectl(["get", "service", service_name])
        return True
    except Exception:
        return False


class KubeInstance(InfraInstance):
    plugin_class: type[InfraPlugin]

    def __init__(self, session, deps):
        super().__init__(session, deps)
        self._db_restorer: PsycopgDatabaseRestorer | None = None
        self._db_port_forward_proc: Popen | None = None
        self._db_forward_port: int | None = None
        self._redis_restorer: RedisStateRestorer | None = None
        self._redis_inmem_port_forward_proc: Popen | None = None
        self._redis_inmem_forward_port: int | None = None
        self._redis_ondisk_port_forward_proc: Popen | None = None
        self._redis_ondisk_forward_port: int | None = None
        self._api_port_forward_proc: Popen | None = None
        self._api_forward_port: int | None = None
        self._minio_port_forward_proc: Popen | None = None
        self._minio_forward_port: int | None = None
        self._db_port_forward_log = None
        self._redis_inmem_port_forward_log = None
        self._redis_ondisk_port_forward_log = None
        self._api_port_forward_log = None
        self._minio_port_forward_log = None
        self._auto_started_stack = False

    def _runtime_project_name(self) -> str:
        return RuntimeInfraConfig.get_run_prefix_from_config(self.config)

    def _preferred_forward_port(self, *, state_key: str, start_port: int) -> int:
        state = (
            RuntimeInfraConfig.get_project_config(self._runtime_project_name()).load_state() or {}
        )
        preferred = state.get(state_key)
        if isinstance(preferred, int) and is_port_free(preferred, logger=logger):
            return preferred
        return pick_free_port(start_port, set(), logger=logger)

    def _choose_forward_port(
        self,
        *,
        state_key: str,
        start_port: int,
        attempted_ports: set[int],
    ) -> int:
        state = (
            RuntimeInfraConfig.get_project_config(self._runtime_project_name()).load_state() or {}
        )
        preferred = state.get(state_key)
        if (
            isinstance(preferred, int)
            and preferred not in attempted_ports
            and is_port_free(preferred, logger=logger)
        ):
            return preferred
        return pick_free_port(start_port, attempted_ports, logger=logger)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        return cls.can_handle_config(session.config)

    def exec_cvat(self, command: list[str] | str):
        pod_name = kube_get_server_pod_name()
        base = [
            "kubectl",
            "--context",
            _kube_context(),
            "--namespace",
            _kube_namespace(),
            "exec",
            pod_name,
            "-c",
            _KUBE_SERVER_CONTAINER,
            "--",
        ]
        cmd = base + ["sh", "-c", command] if isinstance(command, str) else base + command
        return run_command(cmd, logger=logger)[0]

    def exec_redis_inmem(self, command: list[str] | str):
        pod_name = kube_get_redis_inmem_pod_name()
        redis_command = ["sh", "-c", command] if isinstance(command, str) else command
        return run_command(
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "exec",
                pod_name,
                "--",
                *redis_command,
            ],
            logger=logger,
        )[0]

    def exec_cvat_cp(self, source: Path, target: str, *, cvat_host: str) -> None:
        kubectl_cp(
            source,
            f"{cvat_host}:{target}",
            context=_kube_context(),
            namespace=_kube_namespace(),
            container=_KUBE_SERVER_CONTAINER,
            logger=logger,
        )

    def _get_cvat_host(self) -> str:
        return kube_get_server_pod_name()

    def _persist_runtime_state(
        self,
        *,
        project_name: str,
        base_url: str,
        minio_endpoint_url: str,
        kube_fingerprint: dict | None = None,
    ) -> None:
        project_cfg = RuntimeInfraConfig.get_project_config(project_name)
        state = project_cfg.load_state() or {}
        state.update(
            {
                "platform": "kube",
                "kube_profile": _kube_profile(),
                "kube_namespace": _kube_namespace(),
                "kube_release": _kube_release(),
                "base_url": base_url,
                "minio_endpoint_url": minio_endpoint_url,
            }
        )
        if kube_fingerprint is not None:
            state["kube_fingerprint"] = kube_fingerprint
        project_cfg.save_state(state)

    def _resolve_traefik_nodeport_url(self) -> str:
        ingress_service = _kube_traefik_service()
        if not _kube_service_exists(ingress_service):
            raise RuntimeError(
                f"Expected ingress service '{ingress_service}' was not found "
                f"in namespace '{_kube_namespace()}'"
            )

        service_json = _kubectl(["get", "service", ingress_service, "-o", "json"])[0]
        service = json.loads(service_json)
        node_port = None
        for port in service.get("spec", {}).get("ports", []):
            if int(port.get("port", 0)) == 80:
                node_port = port.get("nodePort")
                break
        if not node_port:
            raise RuntimeError(f"Service '{ingress_service}' has no NodePort mapped for port 80")

        minikube_ip = run_command(
            ["minikube", "-p", _kube_profile(), "ip"],
            logger=logger,
        )[0].strip()
        if not minikube_ip:
            raise RuntimeError("Could not resolve minikube IP")

        return f"http://{minikube_ip}:{int(node_port)}"

    def _print_up_instructions(self, *, base_url: str) -> None:
        print("Kubernetes test infrastructure is ready.")
        print(f"CVAT URL: {base_url}")
        print(f"Admin login: {ADMIN_USER} / {ADMIN_PASS}")
        print("If this URL is not reachable from your host (common on macOS + docker driver):")
        print(
            "  minikube -p "
            + _kube_profile()
            + " service -n "
            + _kube_namespace()
            + " "
            + _kube_traefik_service()
            + " --url"
        )
        print("If command returns 127.0.0.1 URL, open it as localhost in browser.")

    def _is_kube_stack_ready(self, *, timeout_s: int | None = None) -> bool:
        try:
            _wait_for_kube_ready(timeout_s=timeout_s or self.deps.waiting_time)
            return True
        except Exception:
            return False

    def _ensure_kube_stack(self, *, run_prefix: str) -> dict:
        profile = _kube_profile()
        cpus = str(self.config.getoption("--kube-cpus") or "").strip()
        memory = str(self.config.getoption("--kube-memory") or "").strip()
        created = _start_minikube(
            profile=profile,
            cpus=cpus,
            memory=memory,
        )
        _ensure_static_images_cached(profile)
        if created:
            run_command(
                ["minikube", "-p", profile, "cache", "reload"],
                capture_output=False,
                logger=logger,
            )

        project_cfg = RuntimeInfraConfig.get_project_config(run_prefix)
        state = project_cfg.load_state() or {}
        requested_fingerprint = _build_kube_fingerprint(
            cvat_root_dir=self.deps.cvat_root_dir,
            cpus=cpus,
            memory=memory,
        )
        saved_fingerprint = state.get("kube_fingerprint")

        release_exists = _helm_release_exists(
            release=_kube_release(), namespace=_kube_namespace()
        ) and _helm_release_exists(release=_kube_test_release(), namespace=_kube_namespace())
        fingerprint_matches = _fingerprints_equal(saved_fingerprint, requested_fingerprint)
        if not created and release_exists and fingerprint_matches:
            # When the minikube profile already exists, the API server can come
            # back before CVAT pods finish becoming Ready. Wait for the saved
            # release before declaring the stack stale and forcing a reconcile.
            if self._is_kube_stack_ready(timeout_s=self.deps.waiting_time):
                logger.info(
                    "Reusing healthy minikube/helm stack for run-prefix '%s' (fingerprint matched)",
                    run_prefix,
                )
                self._auto_started_stack = False
                self._copy_file_share()
                self._seed_minio_test_data()
                return requested_fingerprint

            logger.info(
                "Existing minikube/helm stack for run-prefix '%s' did not become ready "
                "within %ss; falling back to reconcile",
                run_prefix,
                self.deps.waiting_time,
            )

        logger.info(
            "Reconciling minikube/helm stack for run-prefix '%s' "
            "(created=%s, release_exists=%s, fingerprint_match=%s)",
            run_prefix,
            created,
            release_exists,
            fingerprint_matches,
        )
        _load_images_into_minikube(profile)
        _helm_upgrade_install_test_chart(
            cvat_root_dir=self.deps.cvat_root_dir,
            release=_kube_test_release(),
            namespace=_kube_namespace(),
        )
        _helm_upgrade_install_main_chart(
            cvat_root_dir=self.deps.cvat_root_dir,
            release=_kube_release(),
            namespace=_kube_namespace(),
        )
        _wait_for_kube_ready(timeout_s=self.deps.waiting_time)
        self._auto_started_stack = True
        self._copy_file_share()
        self._seed_minio_test_data()
        return _build_kube_fingerprint(
            cvat_root_dir=self.deps.cvat_root_dir,
            cpus=cpus,
            memory=memory,
        )

    def _reuse_kube_stack(self, *, run_prefix: str) -> dict | None:
        profile = _kube_profile()
        cpus = str(self.config.getoption("--kube-cpus") or "").strip()
        memory = str(self.config.getoption("--kube-memory") or "").strip()

        _use_minikube_context(profile)
        if not _kube_api_reachable(_kube_context()):
            _start_minikube(profile=profile, cpus=cpus, memory=memory)

        if not (
            _helm_release_exists(release=_kube_release(), namespace=_kube_namespace())
            and _helm_release_exists(release=_kube_test_release(), namespace=_kube_namespace())
        ):
            raise pytest.UsageError(
                f"--infra={InfraMode.REUSE} requires existing helm releases "
                f"'{_kube_release()}' and '{_kube_test_release()}' in namespace '{_kube_namespace()}'"
            )

        if not self._is_kube_stack_ready(timeout_s=self.deps.waiting_time):
            raise pytest.UsageError(
                f"--infra={InfraMode.REUSE} requires a healthy kube stack for run-prefix '{run_prefix}'"
            )

        project_cfg = RuntimeInfraConfig.get_project_config(run_prefix)
        state = project_cfg.load_state() or {}
        saved_fingerprint = state.get("kube_fingerprint")
        if saved_fingerprint:
            current_fingerprint = _build_kube_fingerprint(
                cvat_root_dir=self.deps.cvat_root_dir,
                cpus=cpus,
                memory=memory,
            )
            if not _fingerprints_equal(saved_fingerprint, current_fingerprint):
                logger.error(
                    "Kube reuse fingerprint mismatch for run-prefix '%s': %s",
                    run_prefix,
                    json.dumps(
                        _fingerprint_diff(saved_fingerprint, current_fingerprint), sort_keys=True
                    ),
                )
                raise pytest.UsageError(
                    f"--infra={InfraMode.REUSE} fingerprint mismatch for run-prefix '{run_prefix}'. "
                    f"Run '--infra=up' again."
                )
            self._auto_started_stack = False
            return current_fingerprint

        self._auto_started_stack = False
        return None

    def _copy_file_share(self) -> None:
        with _external_phase("kube.copy_file_share"):
            self._copy_file_share_inner()

    def _copy_file_share_inner(self) -> None:
        mounted_dir = RuntimeInfraConfig.get_cvat_root_dir() / "tests/mounted_file_share"
        if not mounted_dir.exists():
            return

        server_pod = kube_get_server_pod_name()
        kubectl_cp(
            mounted_dir,
            f"{server_pod}:/home/django/share/",
            context=_kube_context(),
            namespace=_kube_namespace(),
            container=_KUBE_SERVER_CONTAINER,
            logger=logger,
        )
        self.exec_cvat(
            [
                "bash",
                "-lc",
                "if [ -d /home/django/share/mounted_file_share ]; then "
                "find /home/django/share/mounted_file_share -mindepth 1 -maxdepth 1 "
                "-exec mv {} /home/django/share/ \\; ; "
                "rm -rf /home/django/share/mounted_file_share; "
                "fi",
            ]
        )

    def _teardown_kube_stack(self, *, run_prefix: str, delete_profile: bool = False) -> None:
        _use_minikube_context(_kube_profile())
        namespace = _kube_namespace()
        _helm_uninstall(release=_kube_release(), namespace=namespace)
        _helm_uninstall(release=_kube_test_release(), namespace=namespace)
        if namespace != _DEFAULT_KUBE_NAMESPACE:
            try:
                _delete_kube_namespace(namespace)
            except Exception:
                logger.warning(
                    "Failed to delete test namespace %s during kube teardown",
                    namespace,
                    exc_info=True,
                )
        if delete_profile:
            _stop_minikube(_kube_profile())
        RuntimeInfraConfig.get_project_config(run_prefix).delete_state()

    @staticmethod
    def _clear_s3_bucket(client, bucket: str) -> None:
        token = None
        while True:
            kwargs = {"Bucket": bucket, "MaxKeys": 1000}
            if token:
                kwargs["ContinuationToken"] = token
            response = client.list_objects_v2(**kwargs)
            objects = response.get("Contents", [])
            if objects:
                client.delete_objects(
                    Bucket=bucket,
                    Delete={"Objects": [{"Key": item["Key"]} for item in objects], "Quiet": True},
                )
            if not response.get("IsTruncated"):
                break
            token = response.get("NextContinuationToken")

    @staticmethod
    def _upload_dir_to_s3(client, *, source_dir, bucket: str, prefix: str = "") -> None:
        prefix = prefix.strip("/")
        base_prefix = f"{prefix}/" if prefix else ""
        for path in sorted(source_dir.rglob("*")):
            if not path.is_file():
                continue
            relative_path = path.relative_to(source_dir).as_posix()
            key = f"{base_prefix}{relative_path}"
            client.upload_file(str(path), bucket, key)

    @staticmethod
    def _set_public_bucket_policy(client) -> None:
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowPublicList",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                    "Resource": ["arn:aws:s3:::public"],
                },
                {
                    "Sid": "AllowPublicRead",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::public/*"],
                },
            ],
        }
        client.put_bucket_policy(Bucket="public", Policy=json.dumps(policy))

    def _seed_minio_test_data(self) -> None:
        with _external_phase("kube.seed_minio"):
            self._seed_minio_test_data_inner()

    def _seed_minio_test_data_inner(self) -> None:
        minio_service = _kube_minio_service()
        if not _kube_service_exists(minio_service):
            logger.info(
                "MinIO service '%s' is not present in namespace '%s'; skipping seed",
                minio_service,
                _kube_namespace(),
            )
            return

        local_port = pick_free_port(19000, set(), logger=logger)
        process = Popen(  # nosec
            [
                "kubectl",
                "--context",
                _kube_context(),
                "--namespace",
                _kube_namespace(),
                "port-forward",
                f"service/{minio_service}",
                f"{local_port}:9000",
            ],
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )

        endpoint_url = f"http://127.0.0.1:{local_port}"
        try:
            deadline = monotonic() + 30
            s3_client = None
            last_error = ""
            while monotonic() < deadline:
                rc = process.poll()
                if rc is not None:
                    output = process.stdout.read() if process.stdout else ""
                    raise RuntimeError(
                        "kubectl port-forward for MinIO exited unexpectedly "
                        f"with code {rc}. Output:\n{output}"
                    )

                try:
                    s3 = boto3.resource(
                        "s3",
                        aws_access_key_id=_MINIO_ACCESS_KEY,
                        aws_secret_access_key=_MINIO_SECRET_KEY,
                        endpoint_url=endpoint_url,
                    )
                    s3_client = s3.meta.client
                    s3_client.list_buckets()
                    break
                except BaseException as ex:
                    last_error = str(ex)
                    sleep(0.5)

            if s3_client is None:
                raise RuntimeError(
                    "Failed to connect to test MinIO in kubernetes within timeout. "
                    f"Last error: {last_error}"
                )

            existing_buckets = {
                bucket["Name"] for bucket in s3_client.list_buckets().get("Buckets", [])
            }
            for bucket_name in _MINIO_BUCKETS:
                if bucket_name not in existing_buckets:
                    s3_client.create_bucket(Bucket=bucket_name)
                self._clear_s3_bucket(s3_client, bucket_name)

            mounted_file_share_dir = self.deps.cvat_root_dir / "tests/mounted_file_share"
            manifest_dir = (
                self.deps.cvat_root_dir / "tests/cypress/e2e/actions_tasks/assets/case_65_manifest"
            )
            manifest_file = manifest_dir / "manifest.jsonl"
            if not mounted_file_share_dir.exists():
                raise RuntimeError(
                    f"Expected test asset directory is missing: {mounted_file_share_dir}"
                )
            if not manifest_dir.exists():
                raise RuntimeError(f"Expected test asset directory is missing: {manifest_dir}")
            if not manifest_file.exists():
                raise RuntimeError(f"Expected test asset file is missing: {manifest_file}")

            for bucket_name in _MINIO_CONTENT_BUCKETS:
                bucket_prefix = "sub" if bucket_name == "private" else ""
                self._upload_dir_to_s3(
                    s3_client,
                    source_dir=mounted_file_share_dir,
                    bucket=bucket_name,
                    prefix=bucket_prefix,
                )
                images_prefix = (
                    "images_with_manifest"
                    if not bucket_prefix
                    else f"{bucket_prefix}/images_with_manifest"
                )
                self._upload_dir_to_s3(
                    s3_client,
                    source_dir=manifest_dir,
                    bucket=bucket_name,
                    prefix=images_prefix,
                )
                for index in (1, 2):
                    s3_client.upload_file(
                        str(manifest_file),
                        bucket_name,
                        f"{images_prefix}/manifest_{index}.jsonl",
                    )

            self._set_public_bucket_policy(s3_client)
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except BaseException:
                    process.kill()
                    process.wait(timeout=5)

    def _start_service_port_forward(
        self,
        *,
        service_name: str,
        remote_port: int,
        start_port: int,
        proc_attr: str,
        port_attr: str,
        log_attr: str,
        log_name: str,
    ) -> int:
        proc = getattr(self, proc_attr)
        forward_port = getattr(self, port_attr)
        if proc is not None and forward_port is not None and proc.poll() is None:
            return int(forward_port)
        if proc is not None:
            self._close_port_forward(proc_attr=proc_attr, port_attr=port_attr, log_attr=log_attr)

        attempted_ports: set[int] = set()
        state_key = {
            "_api_forward_port": "http_port",
            "_minio_forward_port": "minio_port",
        }[port_attr]
        last_error: str | None = None

        for _ in range(5):
            local_port = self._choose_forward_port(
                state_key=state_key,
                start_port=start_port,
                attempted_ports=attempted_ports,
            )
            attempted_ports.add(local_port)
            log_handle, log_path = self._open_port_forward_log(log_name)
            process = Popen(  # nosec
                [
                    "kubectl",
                    "--context",
                    _kube_context(),
                    "--namespace",
                    _kube_namespace(),
                    "port-forward",
                    f"service/{service_name}",
                    f"{local_port}:{remote_port}",
                ],
                stdout=log_handle,
                stderr=STDOUT,
                text=True,
            )

            deadline = monotonic() + 3
            while monotonic() < deadline:
                rc = process.poll()
                if rc is not None:
                    self._close_log_handle(log_handle)
                    last_error = (
                        "kubectl port-forward exited unexpectedly "
                        f"for service/{service_name} with code {rc}. See log: {log_path}"
                    )
                    break
                sleep(0.2)
                if process.poll() is None:
                    setattr(self, proc_attr, process)
                    setattr(self, port_attr, local_port)
                    setattr(self, log_attr, log_handle)
                    return local_port
            else:
                setattr(self, proc_attr, process)
                setattr(self, port_attr, local_port)
                setattr(self, log_attr, log_handle)
                return local_port
        raise RuntimeError(
            last_error or f"Failed to start kubectl port-forward for service/{service_name}"
        )

    def _start_runtime_port_forwards(
        self, *, project_name: str, kube_fingerprint: dict | None = None
    ) -> None:
        with _external_phase("kube.start_port_forwards"):
            self._start_runtime_port_forwards_inner(
                project_name=project_name,
                kube_fingerprint=kube_fingerprint,
            )

    def _start_runtime_port_forwards_inner(
        self, *, project_name: str, kube_fingerprint: dict | None = None
    ) -> None:
        infra_mode = getattr(self.config, "_cvat_infra_mode", InfraMode.AUTO)
        use_backend_direct = infra_mode in {InfraMode.UP, InfraMode.RESTORE_DB}
        api_service = _kube_backend_service() if use_backend_direct else _kube_traefik_service()
        api_remote_port = 8080 if use_backend_direct else 80
        api_log_name = "backend-8080" if use_backend_direct else "traefik-8080"

        if not _kube_service_exists(api_service):
            raise RuntimeError(
                f"Expected API service '{api_service}' was not found "
                f"in namespace '{_kube_namespace()}'"
            )

        # For infra-only bootstrap modes we talk to the backend service directly
        # to keep Traefik out of the cold-start critical path. Normal
        # non-parallel test execution continues to use Traefik to preserve the
        # standard request path.
        api_port = self._start_service_port_forward(
            service_name=api_service,
            remote_port=api_remote_port,
            start_port=8080,
            proc_attr="_api_port_forward_proc",
            port_attr="_api_forward_port",
            log_attr="_api_port_forward_log",
            log_name=api_log_name,
        )
        base_url = f"http://localhost:{api_port}"

        minio_url = "http://127.0.0.1:9000"
        minio_service = _kube_minio_service()
        if _kube_service_exists(minio_service):
            minio_port = self._start_service_port_forward(
                service_name=minio_service,
                remote_port=9000,
                start_port=9000,
                proc_attr="_minio_port_forward_proc",
                port_attr="_minio_forward_port",
                log_attr="_minio_port_forward_log",
                log_name="minio-9000",
            )
            minio_url = f"http://127.0.0.1:{minio_port}"
        else:
            logger.warning(
                "MinIO service '%s' is not found in namespace '%s'; "
                "cloud-storage tests may fail if enabled",
                minio_service,
                _kube_namespace(),
            )

        _configure_kube_runtime_env(
            project_name=project_name,
            base_url=base_url,
            minio_endpoint_url=minio_url,
        )
        self._persist_runtime_state(
            project_name=project_name,
            base_url=base_url,
            minio_endpoint_url=minio_url,
            kube_fingerprint=kube_fingerprint,
        )

    def _restore_from_assets(self) -> None:
        with _external_phase("kube.restore_assets_db"):
            self._restore_from_assets_inner()

    def _restore_from_assets_inner(self) -> None:
        from infra import health as infra_health

        _append_kube_trace("TRACE kube restore: start restore_cvat_data")
        with _external_phase("kube.restore.restore_cvat_data"):
            self.restore_cvat_data()
        _append_kube_trace("TRACE kube restore: finished restore_cvat_data")
        server_pod_name = kube_get_server_pod_name()
        _append_kube_trace(f"TRACE kube restore: start copy data.json to {server_pod_name}")
        with _external_phase("kube.restore.copy_data_json"):
            kubectl_cp(
                self.prepare_runtime_db_fixture(),
                f"{server_pod_name}:/tmp/data.json",
                context=_kube_context(),
                namespace=_kube_namespace(),
                container=_KUBE_SERVER_CONTAINER,
                logger=logger,
            )
        _append_kube_trace("TRACE kube restore: finished copy data.json")

        _append_kube_trace("TRACE kube restore: start wait_for_services")
        with _external_phase("kube.restore.wait_for_services"):
            infra_health.wait_for_services(self.deps.waiting_time)
        _append_kube_trace("TRACE kube restore: finished wait_for_services")
        _append_kube_trace("TRACE kube restore: start loaddata")
        with _external_phase("kube.restore.loaddata"):
            self.exec_cvat(
                ["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"]
            )
        _append_kube_trace("TRACE kube restore: finished loaddata")
        _append_kube_trace("TRACE kube restore: start restore_template")
        with _external_phase("kube.restore.restore_template"):
            self._get_db_restorer().restore_from_template(source_db="cvat", target_db="test_db")
        _append_kube_trace("TRACE kube restore: finished restore_template")
        _append_kube_trace("TRACE kube restore: start wait_for_auth_login")
        with _external_phase("kube.restore.wait_for_auth_login"):
            infra_health.wait_for_auth_login_ready()
        _append_kube_trace("TRACE kube restore: finished wait_for_auth_login")

    def start(self) -> None:
        config = self.config
        if config.getoption("--collect-only"):
            return
        from infra import health as infra_health

        infra_mode = getattr(config, "_cvat_infra_mode", InfraMode.AUTO)
        run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(config)
        os.environ["CVAT_TEST_RUN_PREFIX"] = run_prefix

        if infra_mode == InfraMode.DOWN:
            self._close_db_restorer()
            self._close_redis_restorer()
            self._close_runtime_port_forwards()
            self._teardown_kube_stack(
                run_prefix=run_prefix,
                delete_profile=bool(config.getoption("--kube-delete-profile")),
            )
            pytest.exit("Kubernetes test infrastructure has been stopped", returncode=0)

        RuntimeInfraConfig.write_context_for_project(run_prefix)
        try:
            if infra_mode == InfraMode.REUSE:
                kube_fingerprint = self._reuse_kube_stack(run_prefix=run_prefix)
            else:
                kube_fingerprint = self._ensure_kube_stack(run_prefix=run_prefix)
        except Exception:
            _collect_kube_diagnostics(RuntimeInfraConfig.get_run_dir() / "startup")
            raise

        if infra_mode == InfraMode.UP:
            _append_kube_trace("TRACE kube infra=up: start runtime port-forwards")
            self._start_runtime_port_forwards(
                project_name=run_prefix, kube_fingerprint=kube_fingerprint
            )
            _append_kube_trace("TRACE kube infra=up: start restore_from_assets")
            self._restore_from_assets()
            _append_kube_trace("TRACE kube infra=up: restore_from_assets finished")
            base_url = RuntimeInfraConfig.get_base_url()
            self._print_up_instructions(base_url=base_url)
            _append_kube_trace("TRACE kube infra=up: exiting successfully")
            pytest.exit("Kubernetes test infrastructure is ready.", returncode=0)

        self._start_runtime_port_forwards(
            project_name=run_prefix, kube_fingerprint=kube_fingerprint
        )

        if infra_mode == InfraMode.REUSE:
            infra_health.wait_for_services(self.deps.waiting_time)
            infra_health.wait_for_auth_login_ready()
            return

        if infra_mode in {InfraMode.AUTO, InfraMode.RESTORE_DB}:
            self._restore_from_assets()

        if infra_mode == InfraMode.RESTORE_DB:
            pytest.exit("CVAT database has been restored from test assets.", returncode=0)

    def finish(self) -> None:
        if self.should_collect_failure_logs():
            self.collect_failure_logs()
        self._close_db_restorer()
        self._close_redis_restorer()
        self._close_runtime_port_forwards()
        infra_mode = getattr(self.config, "_cvat_infra_mode", InfraMode.AUTO)
        if infra_mode == InfraMode.AUTO and self._auto_started_stack:
            run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(self.config)
            self._teardown_kube_stack(
                run_prefix=run_prefix,
                delete_profile=bool(self.config.getoption("--kube-delete-profile")),
            )

    def collect_failure_logs(self) -> None:
        _collect_kube_diagnostics(self.failure_logs_dir())

    def restore_db(self) -> None:
        self._get_db_restorer().restore_from_template(source_db="test_db", target_db="cvat")

    def restore_cvat_data(self) -> None:
        super().restore_cvat_data()
        self._copy_file_share_inner()

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(
            ["/bin/sh", "-c", f'python "{RuntimeInfraConfig.get_clickhouse_init_script()}" --clear']
        )

    def restore_redis_inmem(self) -> None:
        self._get_redis_restorer().restore_inmem()

    def restore_redis_ondisk(self) -> None:
        self._get_redis_restorer().restore_ondisk()

    def drain_background_jobs(self, *, timeout_seconds: int = 20) -> None:
        if self._background_job_cleaner is None:
            self._background_job_cleaner = BackgroundJobCleaner(
                self._get_redis_restorer().inmem_db0
            )

        self._background_job_cleaner.drain(_BACKGROUND_JOB_QUEUES, timeout_seconds=timeout_seconds)

    def _open_port_forward_log(self, log_name: str):
        log_dir = RuntimeInfraConfig.get_run_dir() / "port-forwards"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / f"{log_name}.log"
        handle = open(log_path, "a", buffering=1)
        return handle, log_path

    @staticmethod
    def _close_log_handle(handle) -> None:
        if handle is None:
            return
        try:
            handle.close()
        except Exception:
            logger.debug("Failed to close log handle", exc_info=True)

    def _close_port_forward(self, *, proc_attr: str, port_attr: str, log_attr: str) -> None:
        proc = getattr(self, proc_attr)
        if proc is not None and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except BaseException:
                proc.kill()
                proc.wait(timeout=5)
        setattr(self, proc_attr, None)
        setattr(self, port_attr, None)
        handle = getattr(self, log_attr)
        self._close_log_handle(handle)
        setattr(self, log_attr, None)

    def _close_runtime_port_forwards(self) -> None:
        self._close_port_forward(
            proc_attr="_api_port_forward_proc",
            port_attr="_api_forward_port",
            log_attr="_api_port_forward_log",
        )
        self._close_port_forward(
            proc_attr="_minio_port_forward_proc",
            port_attr="_minio_forward_port",
            log_attr="_minio_port_forward_log",
        )

    def _close_db_restorer(self) -> None:
        if self._db_restorer is not None:
            self._db_restorer.close()
            self._db_restorer = None

        self._close_port_forward(
            proc_attr="_db_port_forward_proc",
            port_attr="_db_forward_port",
            log_attr="_db_port_forward_log",
        )

    def _close_redis_restorer(self) -> None:
        if self._redis_restorer is not None:
            self._redis_restorer.close()
            self._redis_restorer = None

        self._close_port_forward(
            proc_attr="_redis_inmem_port_forward_proc",
            port_attr="_redis_inmem_forward_port",
            log_attr="_redis_inmem_port_forward_log",
        )
        self._close_port_forward(
            proc_attr="_redis_ondisk_port_forward_proc",
            port_attr="_redis_ondisk_forward_port",
            log_attr="_redis_ondisk_port_forward_log",
        )

    def _start_db_port_forward(self) -> int:
        if self._db_port_forward_proc is not None and self._db_forward_port is not None:
            if self._db_port_forward_proc.poll() is None:
                return self._db_forward_port
            self._close_db_restorer()

        db_pod_name = kube_get_db_pod_name()
        attempted_ports: set[int] = set()
        last_error: str | None = None
        for _ in range(5):
            local_port = self._choose_forward_port(
                state_key="db_port",
                start_port=15432,
                attempted_ports=attempted_ports,
            )
            attempted_ports.add(local_port)
            self._db_port_forward_log, log_path = self._open_port_forward_log("postgres-15432")
            self._db_port_forward_proc = Popen(  # nosec
                [
                    "kubectl",
                    "--context",
                    _kube_context(),
                    "--namespace",
                    _kube_namespace(),
                    "port-forward",
                    f"pod/{db_pod_name}",
                    f"{local_port}:5432",
                ],
                stdout=self._db_port_forward_log,
                stderr=STDOUT,
                text=True,
            )
            sleep(0.2)
            if self._db_port_forward_proc.poll() is None:
                self._db_forward_port = local_port
                os.environ["CVAT_TEST_DB_PORT"] = str(local_port)
                return local_port
            last_error = (
                "kubectl port-forward for PostgreSQL exited unexpectedly "
                f"with code {self._db_port_forward_proc.returncode}. See log: {log_path}"
            )
            self._close_db_restorer()
        raise RuntimeError(last_error or "Failed to start kubectl port-forward for PostgreSQL")

    def _start_redis_inmem_port_forward(self) -> int:
        if (
            self._redis_inmem_port_forward_proc is not None
            and self._redis_inmem_forward_port is not None
        ):
            if self._redis_inmem_port_forward_proc.poll() is None:
                return self._redis_inmem_forward_port
            self._close_redis_restorer()

        redis_pod_name = kube_get_redis_inmem_pod_name()
        attempted_ports: set[int] = set()
        last_error: str | None = None
        for _ in range(5):
            local_port = self._choose_forward_port(
                state_key="redis_inmem_port",
                start_port=16379,
                attempted_ports=attempted_ports,
            )
            attempted_ports.add(local_port)
            self._redis_inmem_port_forward_log, log_path = self._open_port_forward_log(
                "redis-inmem-16379"
            )
            self._redis_inmem_port_forward_proc = Popen(  # nosec
                [
                    "kubectl",
                    "--context",
                    _kube_context(),
                    "--namespace",
                    _kube_namespace(),
                    "port-forward",
                    f"pod/{redis_pod_name}",
                    f"{local_port}:6379",
                ],
                stdout=self._redis_inmem_port_forward_log,
                stderr=STDOUT,
                text=True,
            )
            sleep(0.2)
            if self._redis_inmem_port_forward_proc.poll() is None:
                self._redis_inmem_forward_port = local_port
                return local_port
            last_error = (
                "kubectl port-forward for Redis in-memory exited unexpectedly "
                f"with code {self._redis_inmem_port_forward_proc.returncode}. See log: {log_path}"
            )
            self._close_redis_restorer()
        raise RuntimeError(last_error or "Failed to start kubectl port-forward for Redis in-memory")

    def _start_redis_ondisk_port_forward(self) -> int:
        if (
            self._redis_ondisk_port_forward_proc is not None
            and self._redis_ondisk_forward_port is not None
        ):
            if self._redis_ondisk_port_forward_proc.poll() is None:
                return self._redis_ondisk_forward_port
            self._close_redis_restorer()

        redis_pod_name = kube_get_redis_ondisk_pod_name()
        attempted_ports: set[int] = set()
        last_error: str | None = None
        for _ in range(5):
            local_port = self._choose_forward_port(
                state_key="redis_ondisk_port",
                start_port=16666,
                attempted_ports=attempted_ports,
            )
            attempted_ports.add(local_port)
            self._redis_ondisk_port_forward_log, log_path = self._open_port_forward_log(
                "redis-ondisk-16666"
            )
            self._redis_ondisk_port_forward_proc = Popen(  # nosec
                [
                    "kubectl",
                    "--context",
                    _kube_context(),
                    "--namespace",
                    _kube_namespace(),
                    "port-forward",
                    f"pod/{redis_pod_name}",
                    f"{local_port}:6666",
                ],
                stdout=self._redis_ondisk_port_forward_log,
                stderr=STDOUT,
                text=True,
            )
            sleep(0.2)
            if self._redis_ondisk_port_forward_proc.poll() is None:
                self._redis_ondisk_forward_port = local_port
                return local_port
            last_error = (
                "kubectl port-forward for Redis on-disk exited unexpectedly "
                f"with code {self._redis_ondisk_port_forward_proc.returncode}. See log: {log_path}"
            )
            self._close_redis_restorer()
        raise RuntimeError(last_error or "Failed to start kubectl port-forward for Redis on-disk")

    def _read_server_env(self, variable_name: str) -> str:
        value = self.exec_cvat(["sh", "-c", f'printf "%s" "${{{variable_name}:-}}"'])
        return value.strip()

    def _get_db_restorer(self) -> PsycopgDatabaseRestorer:
        if self._db_restorer is not None:
            return self._db_restorer

        local_port = self._start_db_port_forward()
        deadline = monotonic() + 20
        last_error = ""

        while monotonic() < deadline:
            proc = self._db_port_forward_proc
            if proc is None:
                break
            rc = proc.poll()
            if rc is not None:
                raise RuntimeError(
                    "kubectl port-forward for PostgreSQL exited unexpectedly "
                    f"with code {rc}. See log under run artifacts in port-forwards/postgres-15432.log"
                )

            try:
                self._db_restorer = PsycopgDatabaseRestorer(
                    host="127.0.0.1",
                    port=local_port,
                    user="postgres",
                    password="cvat_postgresql_postgres",
                    postgres_db="postgres",
                    connect_timeout_s=1,
                )
                return self._db_restorer
            except BaseException as ex:
                last_error = str(ex)
                sleep(0.2)

        raise RuntimeError(
            "Failed to initialize psycopg PostgreSQL restorer for kubernetes "
            f"within timeout. Last error: {last_error}"
        )

    def _get_redis_restorer(self) -> RedisStateRestorer:
        if self._redis_restorer is not None:
            return self._redis_restorer

        inmem_port = self._start_redis_inmem_port_forward()
        ondisk_port = self._start_redis_ondisk_port_forward()
        inmem_password = self._read_server_env("CVAT_REDIS_INMEM_PASSWORD") or None
        ondisk_password = self._read_server_env("CVAT_REDIS_ONDISK_PASSWORD") or None

        deadline = monotonic() + 20
        last_error = ""
        while monotonic() < deadline:
            try:
                self._redis_restorer = RedisStateRestorer(
                    host="127.0.0.1",
                    inmem_port=inmem_port,
                    ondisk_port=ondisk_port,
                    inmem_password=inmem_password,
                    ondisk_password=ondisk_password,
                )
                return self._redis_restorer
            except BaseException as ex:
                last_error = str(ex)
                sleep(0.2)

        raise RuntimeError(
            "Failed to initialize Redis restorer for kubernetes within timeout. "
            f"Last error: {last_error}"
        )


class KubePlugin(InfraPlugin):
    @classmethod
    def register_options(cls, group) -> None:
        group._addoption(
            "--kube-profile",
            action="store",
            default=_DEFAULT_KUBE_PROFILE,
            help="Minikube profile name for --platform=kube. (default: %(default)s)",
        )
        group._addoption(
            "--kube-cpus",
            action="store",
            default=_DEFAULT_KUBE_CPUS,
            help=(
                "CPU count passed to `minikube start --cpus`. "
                "If empty, minikube chooses automatically."
            ),
        )
        group._addoption(
            "--kube-memory",
            action="store",
            default=_DEFAULT_KUBE_MEMORY,
            help=(
                "Memory amount passed to `minikube start --memory` (e.g. 16g). "
                "If empty, minikube chooses automatically."
            ),
        )
        group._addoption(
            "--kube-namespace",
            action="store",
            default=_DEFAULT_KUBE_NAMESPACE,
            help=(
                "Kubernetes namespace for Helm release and test resources. "
                "If empty, it is derived from --run-prefix."
            ),
        )
        group._addoption(
            "--kube-release",
            action="store",
            default="",
            help=(
                "Helm release name for --platform=kube. "
                "If empty, it is derived from --run-prefix."
            ),
        )
        group._addoption(
            "--kube-delete-profile",
            action="store_true",
            default=False,
            help=(
                "Delete the Minikube profile on --platform=kube --infra=down. "
                "By default, down only removes Helm releases and keeps the cluster warm."
            ),
        )
        group._addoption(
            "--kube-server-image",
            action="store",
            default=_DEFAULT_KUBE_SERVER_IMAGE,
            help="Backend image repository for Helm deploy in kube mode.",
        )
        group._addoption(
            "--kube-frontend-image",
            action="store",
            default=_DEFAULT_KUBE_FRONTEND_IMAGE,
            help="Frontend image repository for Helm deploy in kube mode.",
        )
        group._addoption(
            "--kube-image-tag",
            action="store",
            default=_DEFAULT_KUBE_IMAGE_TAG,
            help="Image tag for backend/frontend deploy in kube mode.",
        )

    @classmethod
    def configure(cls, config) -> None:
        preconfigure_kube_runtime_env(config)

    @classmethod
    def collection_modifyitems(cls, config, items) -> None:
        if config.getoption("--platform") != "kube":
            return

        required_profile = str(InfraProfile.SIMPLE)
        for item in items:
            marker = item.get_closest_marker("infra_profile")
            item_profile = marker.args[0] if marker and marker.args else str(InfraProfile.SIMPLE)
            item_profile = str(RuntimeInfraConfig.parse_infra_profile(item_profile))
            if RuntimeInfraConfig.get_infra_profile_rank(
                item_profile
            ) > RuntimeInfraConfig.get_infra_profile_rank(required_profile):
                required_profile = item_profile

        invocation_args = tuple(str(arg) for arg in config.invocation_params.args)
        explicit_profile_requested = any(
            arg == "--infra-profile" or arg.startswith("--infra-profile=")
            for arg in invocation_args
        )
        requested_profile = str(config.getoption("--infra-profile") or "").strip()
        if explicit_profile_requested:
            selected_profile = str(RuntimeInfraConfig.parse_infra_profile(requested_profile))
            if RuntimeInfraConfig.get_infra_profile_rank(
                selected_profile
            ) < RuntimeInfraConfig.get_infra_profile_rank(required_profile):
                raise pytest.UsageError(
                    f"--infra-profile={selected_profile!r} is too small for the collected test set; "
                    f"required profile is {required_profile!r}"
                )
        else:
            selected_profile = required_profile

        setattr(config, "_cvat_selected_infra_profile", selected_profile)
        os.environ["CVAT_TEST_INFRA_PROFILE"] = selected_profile

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"


KubeInstance.plugin_class = KubePlugin
