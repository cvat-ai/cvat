# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os
import re
from subprocess import PIPE, STDOUT, Popen
from time import monotonic, sleep

import pytest

from infra.config import InfraMode, RuntimeInfraConfig
from infra.db_restore import PsycopgDatabaseRestorer
from infra.debug.host_debug import maybe_wait_for_vscode_attach
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.redis_restore import RedisStateRestorer
from infra.system_utils import kubectl_cp, pick_free_port, run_command

logger = logging.getLogger(__name__)

_DEFAULT_KUBE_PROFILE = "minikube"
_DEFAULT_KUBE_NAMESPACE = "default"
_DEFAULT_KUBE_SERVER_IMAGE = "cvat/server"
_DEFAULT_KUBE_FRONTEND_IMAGE = "cvat/ui"
_DEFAULT_KUBE_IMAGE_TAG = os.environ.get("CVAT_VERSION", "dev")
_KUBE_SERVER_CONTAINER = "cvat-backend"


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


def _kube_namespace() -> str:
    return os.environ.get("CVAT_TEST_KUBE_NAMESPACE", _DEFAULT_KUBE_NAMESPACE)


def _kube_release() -> str:
    return os.environ.get("CVAT_TEST_KUBE_RELEASE", "cvat")


def _kube_server_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_SERVER_IMAGE", _DEFAULT_KUBE_SERVER_IMAGE)


def _kube_frontend_image() -> str:
    return os.environ.get("CVAT_TEST_KUBE_FRONTEND_IMAGE", _DEFAULT_KUBE_FRONTEND_IMAGE)


def _kube_image_tag() -> str:
    return os.environ.get("CVAT_TEST_KUBE_IMAGE_TAG", _DEFAULT_KUBE_IMAGE_TAG)


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
    cmd = ["kubectl", "--namespace", _kube_namespace(), *command]
    return run_command(cmd, capture_output=capture_output, logger=logger)


def _kubectl_root(command: list[str], *, capture_output: bool = True) -> tuple[str, str]:
    cmd = ["kubectl", *command]
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


def kube_exec_cvat(command: list[str] | str):
    pod_name = kube_get_server_pod_name()
    base = [
        "kubectl",
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


def kube_exec_redis_inmem(command: list[str] | str):
    pod_name = kube_get_redis_inmem_pod_name()
    redis_command = ["sh", "-c", command] if isinstance(command, str) else command
    return run_command(
        ["kubectl", "--namespace", _kube_namespace(), "exec", pod_name, "--", *redis_command],
        logger=logger,
    )[0]


def _minikube_running(profile: str) -> bool:
    try:
        host_status = run_command(
            ["minikube", "-p", profile, "status", "--format", "{{.Host}}"],
            logger=logger,
        )[0].strip()
    except Exception:
        return False
    return host_status.lower() == "running"


def _start_minikube(*, profile: str, cpus: str, memory: str, driver: str) -> None:
    if _minikube_running(profile):
        return

    cmd = ["minikube", "start", "-p", profile]
    if cpus:
        cmd += ["--cpus", cpus]
    if memory:
        cmd += ["--memory", memory]
    if driver:
        cmd += ["--driver", driver]

    run_command(cmd, capture_output=False, logger=logger)


def _stop_minikube(profile: str) -> None:
    if not _minikube_running(profile):
        return
    run_command(["minikube", "stop", "-p", profile], capture_output=False, logger=logger)


def _load_images_into_minikube(profile: str) -> None:
    backend_ref = f"{_kube_server_image()}:{_kube_image_tag()}"
    frontend_ref = f"{_kube_frontend_image()}:{_kube_image_tag()}"
    run_command(["minikube", "image", "load", backend_ref, "-p", profile], capture_output=False, logger=logger)
    run_command(["minikube", "image", "load", frontend_ref, "-p", profile], capture_output=False, logger=logger)


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


def _kube_service_exists(service_name: str) -> bool:
    try:
        _kubectl(["get", "service", service_name])
        return True
    except Exception:
        return False


def _copy_file_share() -> None:
    mounted_dir = RuntimeInfraConfig.get_cvat_root_dir() / "tests/mounted_file_share"
    if not mounted_dir.exists():
        return

    server_pod = kube_get_server_pod_name()
    kubectl_cp(
        mounted_dir,
        f"{server_pod}:/home/django/share/",
        namespace=_kube_namespace(),
        container=_KUBE_SERVER_CONTAINER,
        logger=logger,
    )
    kube_exec_cvat(
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


class KubeInstance(InfraInstance):
    plugin_class: type[InfraPlugin]
    exec_cvat = staticmethod(kube_exec_cvat)
    exec_redis_inmem = staticmethod(kube_exec_redis_inmem)

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

    def _persist_runtime_state(self, *, project_name: str, base_url: str, minio_endpoint_url: str) -> None:
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
        project_cfg.save_state(state)

    def _ensure_kube_stack(self) -> None:
        profile = _kube_profile()
        _start_minikube(
            profile=profile,
            cpus=str(self.config.getoption("--kube-cpus") or "").strip(),
            memory=str(self.config.getoption("--kube-memory") or "").strip(),
            driver=str(self.config.getoption("--kube-driver") or "").strip(),
        )
        _load_images_into_minikube(profile)
        _helm_upgrade_install(
            cvat_root_dir=self.deps.cvat_root_dir,
            release=_kube_release(),
            namespace=_kube_namespace(),
        )
        _wait_for_kube_ready(timeout_s=self.deps.waiting_time)
        _copy_file_share()

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

    def _start_runtime_port_forwards(self, *, project_name: str) -> None:
        api_service = f"{_kube_release()}-backend-service"
        if not _kube_service_exists(api_service):
            raise RuntimeError(
                f"Expected service '{api_service}' was not found in namespace '{_kube_namespace()}'"
            )

        # On local minikube + docker driver, nodePort/IP is often unreachable from host.
        # Prefer port-forward for deterministic connectivity across environments.
        api_port = self._start_service_port_forward(
            service_name=api_service,
            remote_port=8080,
            start_port=18080,
            proc_attr="_api_port_forward_proc",
            port_attr="_api_forward_port",
        )
        base_url = f"http://127.0.0.1:{api_port}"

        minio_url = "http://127.0.0.1:9000"
        minio_service = f"{_kube_release()}-minio"
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
        )

    def _restore_from_assets(self) -> None:
        from infra import health as infra_health

        self.restore_cvat_data()
        server_pod_name = kube_get_server_pod_name()
        kubectl_cp(
            self.deps.cvat_db_dir / "data.json",
            f"{server_pod_name}:/tmp/data.json",
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

        self._ensure_kube_stack()

        if infra_mode == InfraMode.UP:
            self._persist_runtime_state(
                project_name=run_prefix,
                base_url="http://localhost:8080",
                minio_endpoint_url="http://localhost:9000",
            )
            pytest.exit("Kubernetes test infrastructure is ready", returncode=0)

        self._start_runtime_port_forwards(project_name=run_prefix)

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

    def restore_cvat_data(self) -> None:
        pod_name = kube_get_server_pod_name()
        kubectl_cp(
            self.deps.cvat_db_dir / "cvat_data.tar.bz2",
            f"{pod_name}:/tmp/cvat_data.tar.bz2",
            namespace=_kube_namespace(),
            container=_KUBE_SERVER_CONTAINER,
            logger=logger,
        )
        self.exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")

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
        value = kube_exec_cvat(["sh", "-c", f'printf "%s" "${{{variable_name}:-}}"'])
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
            help="CPU count passed to `minikube start` for kube up/auto.",
        )
        group._addoption(
            "--kube-memory",
            action="store",
            default="",
            help="Memory passed to `minikube start` (e.g. 8g) for kube up/auto.",
        )
        group._addoption(
            "--kube-driver",
            action="store",
            default="",
            help="Optional minikube driver override for kube up/auto.",
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
