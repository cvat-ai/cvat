# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import json
import logging
import os
import re
from json import JSONDecodeError
from pathlib import Path
from subprocess import PIPE, STDOUT, Popen
from time import monotonic, sleep

import boto3
import pytest

from infra.config import InfraMode, RuntimeInfraConfig
from infra.db_restore import PsycopgDatabaseRestorer
from infra.debug.host_debug import maybe_wait_for_vscode_attach
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.redis_restore import RedisStateRestorer
from infra.system_utils import kubectl_cp, pick_free_port, run_command
from shared.utils.config import ADMIN_PASS, ADMIN_USER

logger = logging.getLogger(__name__)

_DEFAULT_KUBE_PROFILE = "cvat-pytest"
_DEFAULT_KUBE_NAMESPACE = "default"
_DEFAULT_KUBE_SERVER_IMAGE = "cvat/server"
_DEFAULT_KUBE_FRONTEND_IMAGE = "cvat/ui"
_DEFAULT_KUBE_IMAGE_TAG = os.environ.get("CVAT_VERSION", "dev")
_KUBE_SERVER_CONTAINER = "cvat-backend"
_KUBE_FINGERPRINT_VERSION = 1
_MINIO_SERVICE_NAME = "minio"
_MINIO_ACCESS_KEY = "minio_access_key"
_MINIO_SECRET_KEY = "minio_secret_key"  # nosec
_MINIO_BUCKETS = ("private", "public", "test", "importexportbucket", "backingcs")
_MINIO_CONTENT_BUCKETS = ("private", "public", "test", "importexportbucket")


def _normalize_release_name(value: str) -> str:
    candidate = re.sub(r"[^a-z0-9-]", "-", value.lower())
    candidate = re.sub(r"-+", "-", candidate).strip("-")
    if not candidate:
        candidate = "cvat"
    if not candidate[0].isalnum():
        candidate = f"cvat-{candidate}"
    # Helm release names should be <= 53 chars.
    return candidate[:53]


def _default_release_name(run_prefix: str) -> str:
    if run_prefix == RuntimeInfraConfig.get_default_project_name():
        return "cvat"
    return _normalize_release_name(f"cvat-{run_prefix}")


def _kube_profile() -> str:
    return os.environ.get("CVAT_TEST_KUBE_PROFILE", _DEFAULT_KUBE_PROFILE)


def _kube_context() -> str:
    return _kube_profile()


def _kube_namespace() -> str:
    return os.environ.get("CVAT_TEST_KUBE_NAMESPACE", _DEFAULT_KUBE_NAMESPACE)


def _kube_release() -> str:
    return os.environ.get("CVAT_TEST_KUBE_RELEASE", "cvat")


def _kube_traefik_service() -> str:
    return f"{_kube_release()}-traefik"


def _kube_server_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_SERVER_IMAGE", _DEFAULT_KUBE_SERVER_IMAGE)


def _kube_frontend_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_FRONTEND_IMAGE", _DEFAULT_KUBE_FRONTEND_IMAGE)


def _kube_image_tag() -> str:
    return os.environ.get("CVAT_TEST_KUBE_IMAGE_TAG", _DEFAULT_KUBE_IMAGE_TAG)


def _sha256_file(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
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


def _build_kube_fingerprint(*, cvat_root_dir, cpus: str, memory: str) -> dict:
    chart_dir = cvat_root_dir / "helm-chart"
    cvat_values = chart_dir / "cvat.values.yaml"
    test_values = chart_dir / "test.values.yaml"
    chart_yaml = chart_dir / "Chart.yaml"
    chart_lock = chart_dir / "Chart.lock"
    server_image_ref = f"{_kube_server_image()}:{_kube_image_tag()}"
    frontend_image_ref = f"{_kube_frontend_image()}:{_kube_image_tag()}"
    return {
        "version": _KUBE_FINGERPRINT_VERSION,
        "profile": _kube_profile(),
        "namespace": _kube_namespace(),
        "release": _kube_release(),
        "server_image": _kube_server_image(),
        "frontend_image": _kube_frontend_image(),
        "image_tag": _kube_image_tag(),
        "server_image_id": _docker_image_id(server_image_ref),
        "frontend_image_id": _docker_image_id(frontend_image_ref),
        "cpus": cpus,
        "memory": memory,
        "chart": {
            "cvat.values.yaml": _sha256_file(cvat_values) if cvat_values.exists() else "",
            "test.values.yaml": _sha256_file(test_values) if test_values.exists() else "",
            "Chart.yaml": _sha256_file(chart_yaml) if chart_yaml.exists() else "",
            "Chart.lock": _sha256_file(chart_lock) if chart_lock.exists() else "",
        },
    }


def _fingerprints_equal(lhs: dict | None, rhs: dict) -> bool:
    if not lhs:
        return False
    return json.dumps(lhs, sort_keys=True) == json.dumps(rhs, sort_keys=True)


def _configure_kube_runtime_env(*, project_name: str, base_url: str, minio_endpoint_url: str) -> None:
    os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    os.environ["CVAT_BASE_URL"] = base_url
    os.environ["CVAT_MINIO_ENDPOINT_URL"] = minio_endpoint_url

    # shared.utils.config can be imported before session start, refresh constants.
    try:
        import shared.utils.config as config

        config.BASE_URL = base_url
        config.API_URL = base_url + "/api/"
        config.MINIO_ENDPOINT_URL = minio_endpoint_url
    except Exception:
        logger.debug("Failed to refresh shared.utils.config runtime values", exc_info=True)


def preconfigure_kube_runtime_env(config) -> None:
    if config.getoption("--platform") != "kube":
        return

    run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(config)
    infra_mode = RuntimeInfraConfig.parse_infra_mode(config.getoption("--infra"))

    release_name = str(config.getoption("--kube-release") or "").strip()
    if not release_name:
        release_name = _default_release_name(run_prefix)

    os.environ["CVAT_TEST_KUBE_PROFILE"] = str(config.getoption("--kube-profile"))
    os.environ["CVAT_TEST_KUBE_NAMESPACE"] = str(config.getoption("--kube-namespace"))
    os.environ["CVAT_TEST_KUBE_RELEASE"] = _normalize_release_name(release_name)
    os.environ["CVAT_TEST_KUBE_SERVER_IMAGE"] = str(config.getoption("--kube-server-image"))
    os.environ["CVAT_TEST_KUBE_FRONTEND_IMAGE"] = str(config.getoption("--kube-frontend-image"))
    os.environ["CVAT_TEST_KUBE_IMAGE_TAG"] = str(config.getoption("--kube-image-tag"))

    if infra_mode == InfraMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = run_prefix
        return

    project_cfg = RuntimeInfraConfig.get_project_config(run_prefix)
    state = project_cfg.load_state() or {}
    base_url = str(state.get("base_url") or "http://localhost:8080")
    minio_endpoint_url = str(state.get("minio_endpoint_url") or "http://localhost:9000")
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


def _label_selector(extra: str) -> str:
    return f"app.kubernetes.io/instance={_kube_release()},{extra}"


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
    return kube_get_pod_name(_label_selector("app.kubernetes.io/name=redis"))


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


def _start_minikube(*, profile: str, cpus: str, memory: str) -> bool:
    created = False
    if not _minikube_profile_exists(profile):
        created = True

    if not created:
        _use_minikube_context(profile)
        if _kube_api_reachable(_kube_context()):
            return False

    command = [
        "minikube",
        "start",
        "-p",
        profile,
        "--driver=docker",
        "--wait=apiserver,system_pods,default_sa",
        "--wait-timeout=10m",
        "--auto-pause-interval=24h",
    ]
    if cpus:
        command.append(f"--cpus={cpus}")
    if memory:
        command.append(f"--memory={memory}")

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
    run_command(
        ["minikube", "image", "load", backend_ref, "-p", profile],
        capture_output=False,
        logger=logger,
    )
    run_command(
        ["minikube", "image", "load", frontend_ref, "-p", profile],
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


def _helm_upgrade_install(*, cvat_root_dir, release: str, namespace: str) -> None:
    chart_dir = cvat_root_dir / "helm-chart"
    _run_with_retries(["helm", "dependency", "update", str(chart_dir)])

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
            str(chart_dir / "test.values.yaml"),
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
    def wait_selector(selector: str) -> None:
        deadline = monotonic() + timeout_s
        last_error = ""
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
                        "30s",
                    ],
                    capture_output=False,
                )
                return
            except Exception as ex:
                last_error = str(ex)
                sleep(2)

        raise RuntimeError(
            f"Timed out waiting for selector '{selector}' readiness in namespace '{_kube_namespace()}'. "
            f"Last error: {last_error}"
        )

    wait_selector(_label_selector("component=server"))
    wait_selector(_label_selector("app.kubernetes.io/name=postgresql"))
    if _kube_service_exists(_MINIO_SERVICE_NAME):
        wait_selector(_label_selector("component=minio"))


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
            raise RuntimeError(
                f"Service '{ingress_service}' has no NodePort mapped for port 80"
            )

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

        project_cfg = RuntimeInfraConfig.get_project_config(run_prefix)
        state = project_cfg.load_state() or {}
        current_fingerprint = _build_kube_fingerprint(
            cvat_root_dir=self.deps.cvat_root_dir,
            cpus=cpus,
            memory=memory,
        )
        saved_fingerprint = state.get("kube_fingerprint")

        release_exists = _helm_release_exists(
            release=_kube_release(), namespace=_kube_namespace()
        )
        fingerprint_matches = _fingerprints_equal(saved_fingerprint, current_fingerprint)
        if not created and release_exists and fingerprint_matches:
            # When the minikube profile already exists, the API server can come
            # back before CVAT pods finish becoming Ready. Wait for the saved
            # release before declaring the stack stale and forcing a reconcile.
            if self._is_kube_stack_ready(timeout_s=self.deps.waiting_time):
                logger.info(
                    "Reusing healthy minikube/helm stack for run-prefix '%s' (fingerprint matched)",
                    run_prefix,
                )
                self._copy_file_share()
                self._seed_minio_test_data()
                return current_fingerprint

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
        _helm_upgrade_install(
            cvat_root_dir=self.deps.cvat_root_dir,
            release=_kube_release(),
            namespace=_kube_namespace(),
        )
        _wait_for_kube_ready(timeout_s=self.deps.waiting_time)
        self._copy_file_share()
        self._seed_minio_test_data()
        return current_fingerprint

    def _copy_file_share(self) -> None:
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
        if not _kube_service_exists(_MINIO_SERVICE_NAME):
            logger.info(
                "MinIO service '%s' is not present in namespace '%s'; skipping seed",
                _MINIO_SERVICE_NAME,
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
                f"service/{_MINIO_SERVICE_NAME}",
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
                self.deps.cvat_root_dir
                / "tests/cypress/e2e/actions_tasks/assets/case_65_manifest"
            )
            manifest_file = manifest_dir / "manifest.jsonl"
            if not mounted_file_share_dir.exists():
                raise RuntimeError(f"Expected test asset directory is missing: {mounted_file_share_dir}")
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
    ) -> int:
        proc = getattr(self, proc_attr)
        forward_port = getattr(self, port_attr)
        if proc is not None and forward_port is not None and proc.poll() is None:
            return int(forward_port)

        used_ports: set[int] = set()
        local_port = pick_free_port(start_port, used_ports, logger=logger)
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
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )

        deadline = monotonic() + 3
        while monotonic() < deadline:
            rc = process.poll()
            if rc is not None:
                output = process.stdout.read() if process.stdout else ""
                raise RuntimeError(
                    "kubectl port-forward exited unexpectedly "
                    f"for service/{service_name} with code {rc}. Output:\n{output}"
                )
            sleep(0.2)
            if process.poll() is None:
                break

        setattr(self, proc_attr, process)
        setattr(self, port_attr, local_port)
        return local_port

    def _start_runtime_port_forwards(
        self, *, project_name: str, kube_fingerprint: dict | None = None
    ) -> None:
        ingress_service = _kube_traefik_service()
        if not _kube_service_exists(ingress_service):
            raise RuntimeError(
                f"Expected ingress service '{ingress_service}' was not found "
                f"in namespace '{_kube_namespace()}'"
            )

        # Route API/UI via ingress through Traefik to match real Kubernetes path.
        api_port = self._start_service_port_forward(
            service_name=ingress_service,
            remote_port=80,
            start_port=18080,
            proc_attr="_api_port_forward_proc",
            port_attr="_api_forward_port",
        )
        base_url = f"http://localhost:{api_port}"

        minio_url = "http://127.0.0.1:9000"
        minio_service = _MINIO_SERVICE_NAME
        if _kube_service_exists(minio_service):
            minio_port = self._start_service_port_forward(
                service_name=minio_service,
                remote_port=9000,
                start_port=19000,
                proc_attr="_minio_port_forward_proc",
                port_attr="_minio_forward_port",
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
        from infra import health as infra_health

        self.restore_cvat_data()
        server_pod_name = kube_get_server_pod_name()
        kubectl_cp(
            self.deps.cvat_db_dir / "data.json",
            f"{server_pod_name}:/tmp/data.json",
            context=_kube_context(),
            namespace=_kube_namespace(),
            container=_KUBE_SERVER_CONTAINER,
            logger=logger,
        )

        infra_health.wait_for_services(self.deps.waiting_time)
        self.exec_cvat(["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"])
        self._get_db_restorer().restore_from_template(source_db="cvat", target_db="test_db")
        infra_health.wait_for_auth_login_ready()

    def start(self) -> None:
        config = self.config
        if config.getoption("--collect-only"):
            return

        infra_mode = getattr(config, "_cvat_infra_mode", InfraMode.AUTO)
        run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(config)
        os.environ["CVAT_TEST_RUN_PREFIX"] = run_prefix

        if infra_mode == InfraMode.DOWN:
            self._close_db_restorer()
            self._close_redis_restorer()
            self._close_runtime_port_forwards()
            _helm_uninstall(release=_kube_release(), namespace=_kube_namespace())
            _stop_minikube(_kube_profile())
            RuntimeInfraConfig.get_project_config(run_prefix).delete_state()
            pytest.exit("Kubernetes test infrastructure has been stopped", returncode=0)

        kube_fingerprint = self._ensure_kube_stack(run_prefix=run_prefix)

        if infra_mode == InfraMode.UP:
            base_url = self._resolve_traefik_nodeport_url()
            _configure_kube_runtime_env(
                project_name=run_prefix,
                base_url=base_url,
                minio_endpoint_url="http://127.0.0.1:9000",
            )
            self._persist_runtime_state(
                project_name=run_prefix,
                base_url=base_url,
                minio_endpoint_url="http://127.0.0.1:9000",
                kube_fingerprint=kube_fingerprint,
            )
            self._print_up_instructions(base_url=base_url)
            pytest.exit("Kubernetes test infrastructure is ready.", returncode=0)

        self._start_runtime_port_forwards(
            project_name=run_prefix, kube_fingerprint=kube_fingerprint
        )

        if infra_mode in {InfraMode.AUTO, InfraMode.RESTORE_DB}:
            self._restore_from_assets()

        if infra_mode == InfraMode.RESTORE_DB:
            pytest.exit("CVAT database has been restored from test assets.", returncode=0)

        maybe_wait_for_vscode_attach(self.session, cvat_root_dir=self.deps.cvat_root_dir)

    def finish(self) -> None:
        self._close_db_restorer()
        self._close_redis_restorer()
        self._close_runtime_port_forwards()

    def restore_db(self) -> None:
        self._get_db_restorer().restore_from_template(source_db="test_db", target_db="cvat")

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(["/bin/sh", "-c", f'python "{RuntimeInfraConfig.get_clickhouse_init_script()}" --clear'])

    def restore_redis_inmem(self) -> None:
        self._get_redis_restorer().restore_inmem()

    def restore_redis_ondisk(self) -> None:
        self._get_redis_restorer().restore_ondisk()

    def _close_port_forward(self, *, proc_attr: str, port_attr: str) -> None:
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

    def _close_runtime_port_forwards(self) -> None:
        self._close_port_forward(proc_attr="_api_port_forward_proc", port_attr="_api_forward_port")
        self._close_port_forward(proc_attr="_minio_port_forward_proc", port_attr="_minio_forward_port")

    def _close_db_restorer(self) -> None:
        if self._db_restorer is not None:
            self._db_restorer.close()
            self._db_restorer = None

        self._close_port_forward(proc_attr="_db_port_forward_proc", port_attr="_db_forward_port")

    def _close_redis_restorer(self) -> None:
        if self._redis_restorer is not None:
            self._redis_restorer.close()
            self._redis_restorer = None

        self._close_port_forward(
            proc_attr="_redis_inmem_port_forward_proc", port_attr="_redis_inmem_forward_port"
        )
        self._close_port_forward(
            proc_attr="_redis_ondisk_port_forward_proc", port_attr="_redis_ondisk_forward_port"
        )

    def _start_db_port_forward(self) -> int:
        if self._db_port_forward_proc is not None and self._db_forward_port is not None:
            if self._db_port_forward_proc.poll() is None:
                return self._db_forward_port
            self._close_db_restorer()

        local_port = pick_free_port(15432, set(), logger=logger)
        db_pod_name = kube_get_db_pod_name()
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
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )
        self._db_forward_port = local_port
        os.environ["CVAT_TEST_DB_PORT"] = str(local_port)
        return local_port

    def _start_redis_inmem_port_forward(self) -> int:
        if self._redis_inmem_port_forward_proc is not None and self._redis_inmem_forward_port is not None:
            if self._redis_inmem_port_forward_proc.poll() is None:
                return self._redis_inmem_forward_port
            self._close_redis_restorer()

        local_port = pick_free_port(16379, set(), logger=logger)
        redis_pod_name = kube_get_redis_inmem_pod_name()
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
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )
        self._redis_inmem_forward_port = local_port
        return local_port

    def _start_redis_ondisk_port_forward(self) -> int:
        if self._redis_ondisk_port_forward_proc is not None and self._redis_ondisk_forward_port is not None:
            if self._redis_ondisk_port_forward_proc.poll() is None:
                return self._redis_ondisk_forward_port
            self._close_redis_restorer()

        local_port = pick_free_port(16666, set(), logger=logger)
        redis_pod_name = kube_get_redis_ondisk_pod_name()
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
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )
        self._redis_ondisk_forward_port = local_port
        return local_port

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
                output = proc.stdout.read() if proc.stdout else ""
                raise RuntimeError(
                    "kubectl port-forward for PostgreSQL exited unexpectedly "
                    f"with code {rc}. Output:\n{output}"
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
            default="",
            help="Optional CPU count passed to `minikube start --cpus`.",
        )
        group._addoption(
            "--kube-memory",
            action="store",
            default="",
            help="Optional memory amount passed to `minikube start --memory` (e.g. 16g).",
        )
        group._addoption(
            "--kube-namespace",
            action="store",
            default=_DEFAULT_KUBE_NAMESPACE,
            help="Kubernetes namespace for Helm release and test resources.",
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
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"


KubeInstance.plugin_class = KubePlugin
