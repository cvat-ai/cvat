# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from infra.config import LocalRuntimeConfig

LIVE_PORT_CONFIG = {
    "http_port": 18081,
    "logs_port": 18091,
    "db_port": 15433,
    "redis_inmem_port": 16380,
    "redis_ondisk_port": 16667,
    "minio_port": 19002,
    "minio_console_port": 19003,
}


def test_running_non_default_runtime_uses_live_ports_when_state_is_missing(tmp_path):
    local_runtime = LocalRuntimeConfig(project_name="custom", runtime_root_dir=tmp_path)

    port_config = local_runtime.resolve_port_config(
        default_project_name="test",
        used_ports=set(),
        runtime_running=True,
        running_port_config=LIVE_PORT_CONFIG,
    )

    assert port_config == LIVE_PORT_CONFIG
    assert local_runtime.load_state() == LIVE_PORT_CONFIG


def test_running_non_default_runtime_uses_live_ports_when_state_is_partial(tmp_path):
    local_runtime = LocalRuntimeConfig(project_name="custom", runtime_root_dir=tmp_path)
    local_runtime.save_state({"project_name": "custom", "http_port": 18080})

    port_config = local_runtime.resolve_port_config(
        default_project_name="test",
        used_ports=set(),
        runtime_running=True,
        running_port_config=LIVE_PORT_CONFIG,
    )

    assert port_config == LIVE_PORT_CONFIG
    assert local_runtime.load_state() == {"project_name": "custom", **LIVE_PORT_CONFIG}
