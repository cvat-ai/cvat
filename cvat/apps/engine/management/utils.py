# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
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


def process_tasks(
    command: BaseCommand, task_ids: Iterable[int], process_one: Callable[[Task], bool]
) -> None:
    succeeded = failed = ignored = 0

    for task_id in task_ids:
        try:
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist as ex:
                raise CommandError(f"Task #{task_id} does not exist") from ex

            action_taken = process_one(task)
        except Exception:
            failed += 1
            command.stderr.write(command.style.ERROR(f"Task #{task_id}: failure"))
            command.stderr.write(traceback.format_exc(), ending="")
        else:
            if action_taken:
                succeeded += 1
                command.stdout.write(command.style.SUCCESS(f"Task #{task_id}: success"))
            else:
                ignored += 1
                # We're relying on process_one to log the reason for ignoring.

    processed = succeeded + failed + ignored

    command.stdout.write(
        f"Processed {processed} task(s): {succeeded} succeeded, {failed} failed, {ignored} ignored"
    )

    if failed:
        raise CommandError("Failed to move some task(s)")
