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
import tempfile
from collections import defaultdict
from pathlib import Path

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.serializers import sort_dependencies


class Command(BaseCommand):
    help = "Load a JSON fixture, reordering records by model dependencies first."

    def add_arguments(self, parser):
        parser.add_argument("fixture", help="Path to the JSON fixture file.")

    def handle(self, *args, fixture: str, **options):
        with open(fixture) as f:
            records = json.load(f)

        groups: dict[str, list[dict]] = defaultdict(list)
        for record in records:
            groups[record["model"]].append(record)

        models_by_app: dict = defaultdict(list)
        for label in groups:
            model = apps.get_model(label)
            models_by_app[model._meta.app_config].append(model)

        ordered_models = sort_dependencies(list(models_by_app.items()), allow_cycles=True)

        reordered = [
            record
            for model in ordered_models
            for record in groups[f"{model._meta.app_label}.{model._meta.model_name}"]
        ]

        tmp_path = Path(tempfile.gettempdir()) / f"loaddata_sorted_{Path(fixture).name}"
        with open(tmp_path, "w") as f:
            json.dump(reordered, f)

        call_command("loaddata", str(tmp_path))
