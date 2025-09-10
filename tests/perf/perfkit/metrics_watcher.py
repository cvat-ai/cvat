# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import threading
import time
from typing import Callable

import psutil
from perfkit.console_print import console


def start_metrics_watcher(
    interval: float = 3.0,
    cpu_limit: float = 70.0,
    mem_limit: float = 92.0,
    max_alerts: int = 15,
    max_alerts_in_row: int = 5,
    on_threshold_exceeded: Callable[[], None] = lambda: None,
) -> Callable[[], None]:

    stop_event = threading.Event()

    def monitor():
        alert_count = 0
        alert_in_row_count = 0
        has_alert = False
        while not stop_event.is_set():
            cpu = psutil.cpu_percent()
            mem = psutil.virtual_memory().percent

            console.print(f"[blue][METRIC][/blue] CPU: {cpu:.1f}% | RAM: {mem:.1f}%")

            if cpu > cpu_limit or mem > mem_limit:
                has_alert = True
                alert_count += 1
                console.print(
                    f"[red][ALERT][/red] Resource usage high: CPU: {cpu:.1f}% | RAM: {mem:.1f}%"
                )

            if has_alert:
                alert_in_row_count += 1
            else:
                alert_in_row_count = 0

            if alert_in_row_count >= max_alerts_in_row or alert_count >= max_alerts:
                console.print(
                    f"[bold red]🚨 Too many alerts (total: {alert_count}/in row: {alert_in_row_count}), "
                    "stopping test![/bold red]"
                )
                on_threshold_exceeded()
                break
            time.sleep(interval)
            has_alert = False

    thread = threading.Thread(target=monitor, daemon=True)
    thread.start()

    def stop():
        nonlocal stop_event
        stop_event.set()
        thread.join()

    return stop
