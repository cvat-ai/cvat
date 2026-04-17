# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse


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
