# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import math
import time
import traceback
from collections.abc import Callable, Iterable

from django.core.management.base import BaseCommand, CommandError

from ..models import Task


def parse_task_ids(value: str) -> list[int]:
    task_ids = []

    if value.startswith("@"):
        task_ids_path = value[1:]

        with open(task_ids_path) as task_ids_file:
            for line_num, line in enumerate(task_ids_file):
                line = line.strip()
                if not line:
                    continue

                try:
                    task_ids.append(int(line))
                except ValueError as ex:
                    raise RuntimeError(f"{task_ids_path}:{line_num + 1}: Invalid task ID") from ex
    else:
        try:
            task_ids.append(int(value))
        except ValueError as ex:
            raise argparse.ArgumentTypeError(f"Invalid task ID: {value!r}") from ex

    return task_ids


def move_multiple_tasks(
    command: BaseCommand, task_ids: Iterable[int], move_one: Callable[[Task], bool]
) -> None:
    succeeded = failed = ignored = 0
    total_content_size = 0

    time_before_all = time.perf_counter()
    for task_id in task_ids:
        try:
            time_before = time.perf_counter()
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist as ex:
                raise CommandError(f"Task #{task_id} does not exist") from ex

            data = task.data
            if not data:
                raise CommandError(f"Task #{task_id} has no attached data")

            action_was_taken = move_one(task)
            time_after = time.perf_counter()
        except Exception:
            failed += 1
            command.stderr.write(command.style.ERROR(f"Task #{task_id}: failure"))
            command.stderr.write(traceback.format_exc(), ending="")
        else:
            if action_was_taken:
                succeeded += 1
                time_taken = time_after - time_before
                mb_moved = (data.content_size or math.nan) / (1024 * 1024)
                throughput = mb_moved / time_taken if time_taken > 0 else math.inf

                command.stdout.write(
                    command.style.SUCCESS(
                        f"Task #{task_id}: success;"
                        f" taken {time_taken:.3f} s for {mb_moved:.3f} MiB ({throughput:.3f} MiB/s)"
                    )
                )

                # Not using NaN here, since it would make the total useless.
                total_content_size += data.content_size or 0
            else:
                ignored += 1
                # We're relying on move_one to log the reason for ignoring.

    time_after_all = time.perf_counter()
    total_time_taken = time_after_all - time_before_all
    total_mb_moved = total_content_size / (1024 * 1024)
    total_throughput = total_mb_moved / total_time_taken if total_time_taken > 0 else math.inf

    processed = succeeded + failed + ignored

    command.stdout.write(
        f"Processed {processed} task(s): {succeeded} succeeded, {failed} failed, {ignored} ignored"
    )
    command.stdout.write(
        f"Total time taken: {total_time_taken:.3f} s"
        f" for {total_mb_moved:.3f} MiB ({total_throughput:.3f} MiB/s)"
    )

    if failed:
        raise CommandError("Failed to move some task(s)")
