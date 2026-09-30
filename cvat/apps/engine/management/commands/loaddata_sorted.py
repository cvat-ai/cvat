# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Variant of ``loaddata`` that topologically sorts the fixture records by
model dependencies before loading.

Plain ``loaddata`` requires the fixture file to already be in dependency
order: when a record references another via a natural foreign key, the
target model must be loaded first or the reference resolves to ``NULL``
(which then violates ``NOT NULL`` constraints on the FK column, since
``constraint_checks_disabled`` does not relax those). ``dumpdata``
produces such an order incidentally, but its output shifts whenever the
schema gains a new FK, which makes diffs of the committed fixture noisy.

This command lets us commit the fixture in any order (e.g. sorted
alphabetically by model name for stable diffs) and reorder it at load
time using the same dependency-sort algorithm Django itself uses for
serialization.
"""

import json
import sys
import tempfile
from collections import defaultdict

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.serializers import sort_dependencies

STDIN_SENTINEL = "-"


class Command(BaseCommand):
    help = "Load a JSON fixture, reordering records by model dependencies first."

    def add_arguments(self, parser):
        parser.add_argument(
            "fixture",
            nargs="?",
            default=STDIN_SENTINEL,
            help=f'Path to the JSON fixture file. Use "{STDIN_SENTINEL}" '
            "(the default) to read from stdin.",
        )

    def handle(self, *args, **options):
        fixture: str = options["fixture"]
        if fixture == STDIN_SENTINEL:
            records = json.load(sys.stdin)
        else:
            with open(fixture) as f:
                records = json.load(f)

        models_by_name: dict[str, list[dict]] = defaultdict(list)
        for record in records:
            models_by_name[record["model"]].append(record)

        models_by_app: dict = defaultdict(list)
        for model_name in models_by_name:
            model = apps.get_model(model_name)
            models_by_app[model._meta.app_config].append(model)

        ordered_models = sort_dependencies(list(models_by_app.items()), allow_cycles=True)

        reordered = [
            record
            for model in ordered_models
            for record in models_by_name[f"{model._meta.app_label}.{model._meta.model_name}"]
        ]

        with tempfile.NamedTemporaryFile("w", suffix=".json", prefix="loaddata_sorted_") as f:
            json.dump(reordered, f)
            f.flush()

            call_command("loaddata", f.name)
