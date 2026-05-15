#!/usr/bin/env python3
#
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Dump the test CVAT database to JSON with stable ordering.

The default ``manage.py dumpdata`` output is not deterministic: record order
within a model depends on the underlying ``SELECT`` order, which can differ
between runs even when DB contents are identical. This causes spurious
diffs in ``tests/python/shared/assets/cvat_db/data.json`` after each dump,
which then need to be reviewed and reverted by hand.

This script wraps ``dumpdata`` and post-processes its output to make the
result stable:

* records are sorted alphabetically by ``(model, pk)`` (the
  ``loaddata_sorted`` management command reorders by FK dependency at
  load time, so the on-disk order can be arbitrary);
* field keys within each record are sorted alphabetically;
* known unordered many-to-many fields (e.g. ``auth.user.groups``) are
  sorted as well.

It can also preserve volatile timestamp fields (``last_login``,
``*_updated_date``, ``last_used_date`` and similar) from the existing
output file. When preservation is enabled (the default), an unchanged
record keeps its previous timestamp values, so re-dumping after a
no-op test run produces zero diff. Genuinely new records get whatever
timestamp the server wrote.

Usage:

    # default: run dumpdata in the test container and write the
    # normalized output to tests/python/shared/assets/cvat_db/data.json,
    # preserving volatile fields from the existing file.
    python tests/python/shared/utils/dump_test_db.py

    # read pre-existing dump from a file instead of running docker exec
    python tests/python/shared/utils/dump_test_db.py --from-file dump.json

    # also refresh volatile fields (don't preserve from existing output)
    python tests/python/shared/utils/dump_test_db.py --refresh-volatile

    # write to a custom location / stdout
    python tests/python/shared/utils/dump_test_db.py -o /tmp/data.json
    python tests/python/shared/utils/dump_test_db.py -o -
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from subprocess import PIPE, run
from typing import Any

DEFAULT_CONTAINER_NAME = "test_cvat_server_1"

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "shared" / "assets" / "cvat_db" / "data.json"

STDOUT_SENTINEL = "-"

DUMPDATA_EXCLUDES = (
    "admin",
    "auth.permission",
    "authtoken",
    "contenttypes",
    "django_rq",
    "sessions",
)

# Fields whose value changes on every dump even when no test-relevant state
# has changed (auto_now timestamps, last-login markers, etc.). When
# preservation is enabled the script copies these values from the existing
# data.json so that re-dumping an unchanged DB produces no diff.
VOLATILE_FIELDS: dict[str, frozenset[str]] = {
    "auth.user": frozenset({"last_login"}),
    "engine.profile": frozenset({"last_activity_date"}),
    "engine.project": frozenset({"updated_date", "assignee_updated_date"}),
    "engine.task": frozenset({"updated_date", "assignee_updated_date"}),
    "engine.job": frozenset({"updated_date", "assignee_updated_date"}),
    "engine.issue": frozenset({"updated_date", "assignee_updated_date"}),
    "engine.comment": frozenset({"updated_date"}),
    "engine.segment": frozenset({"chunks_updated_date"}),
    "engine.cloudstorage": frozenset({"updated_date"}),
    "webhooks.webhook": frozenset({"updated_date"}),
    "webhooks.webhookdelivery": frozenset({"updated_date"}),
    "quality_control.qualitysettings": frozenset({"updated_date"}),
    "quality_control.qualityreport": frozenset(
        {"assignee_last_updated", "gt_last_updated", "target_last_updated"}
    ),
    "access_tokens.accesstoken": frozenset({"last_used_date", "updated_date"}),
    "organizations.organization": frozenset({"updated_date"}),
}

# Fields holding many-to-many references whose element order is not
# semantically meaningful. Sorting them stabilizes the dump even if the
# m2m join table returns rows in a different order between runs.
SORTABLE_LIST_FIELDS: dict[str, frozenset[str]] = {
    "auth.user": frozenset({"groups", "user_permissions"}),
    "auth.group": frozenset({"permissions"}),
}


# ``DjangoJSONEncoder`` truncates microseconds to milliseconds: a value
# with ``microsecond`` in [1, 999] is encoded as ``.000Z``. After
# ``loaddata`` parses that back to ``microsecond=0``, the next ``dumpdata``
# omits the fraction entirely and writes a bare ``Z`` instead, producing a
# spurious diff. Drop the redundant zero milliseconds up-front so the
# round-trip is idempotent.
ZERO_MS_PATTERN = r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.000(Z|[+-]\d{2}:\d{2})$"


def _strip_zero_milliseconds(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    return re.sub(ZERO_MS_PATTERN, r"\1\2", value)


def _pk_sort_key(pk: Any) -> tuple:
    # `pk` is usually an int but can be a list of natural-key parts.
    # Wrap into a tuple of (type_tag, value) so heterogeneous pks order
    # consistently without TypeError.
    if isinstance(pk, (int, float)):
        return (0, pk)
    if isinstance(pk, list):
        return (1, tuple(_pk_sort_key(p) for p in pk))
    return (2, str(pk))


def _normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    model = record.get("model", "")
    fields = record.get("fields", {})
    sortable = SORTABLE_LIST_FIELDS.get(model, frozenset())

    new_fields: dict[str, Any] = {}
    for key in sorted(fields):
        value = fields[key]
        if key in sortable and isinstance(value, list):
            try:
                value = sorted(value, key=lambda v: json.dumps(v, sort_keys=True))
            except TypeError:
                pass
        value = _strip_zero_milliseconds(value)
        new_fields[key] = value

    return {"model": model, "pk": record.get("pk"), "fields": new_fields}


def _preserve_volatile(
    records: list[dict[str, Any]], reference: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    ref_index = {
        (r.get("model", ""), _pk_sort_key(r.get("pk"))): r.get("fields", {}) for r in reference
    }

    for record in records:
        model = record.get("model", "")
        volatile = VOLATILE_FIELDS.get(model)
        if not volatile:
            continue

        ref_fields = ref_index.get((model, _pk_sort_key(record.get("pk"))))
        if ref_fields is None:
            continue

        fields = record.get("fields", {})
        for name in volatile:
            if name in fields and name in ref_fields:
                fields[name] = ref_fields[name]

    return records


def normalize(
    records: list[dict[str, Any]],
    *,
    reference: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Return ``records`` sorted and field-normalized, with volatile fields
    optionally preserved from ``reference``."""
    normalized = [_normalize_record(r) for r in records]

    if reference is not None:
        _preserve_volatile(normalized, reference=reference)

    # Sort alphabetically by model name (then by pk) so the committed file
    # has a layout that doesn't depend on Django's dependency sort. The
    # ``loaddata_sorted`` management command reorders records by dependency
    # at load time, so any total ordering is fine here.
    normalized.sort(key=lambda r: (r.get("model", ""), _pk_sort_key(r.get("pk"))))
    return normalized


def dump_from_container(container: str = DEFAULT_CONTAINER_NAME) -> list[dict[str, Any]]:
    cmd = [
        "docker",
        "exec",
        container,
        "python",
        "manage.py",
        "dumpdata",
        "--indent",
        "2",
        "--natural-foreign",
    ]
    for ex in DUMPDATA_EXCLUDES:
        cmd.extend(["--exclude", ex])

    proc = run(cmd, check=True, stdout=PIPE)  # nosec
    return json.loads(proc.stdout)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=str(DEFAULT_OUTPUT),
        help=f'Output file (default: %(default)s). Use "{STDOUT_SENTINEL}" for stdout.',
    )

    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        "--from-file",
        type=Path,
        help="Read pre-existing dumpdata JSON from this file instead of running docker exec.",
    )
    source_group.add_argument(
        "--from-stdin",
        action="store_true",
        help="Read pre-existing dumpdata JSON from stdin.",
    )

    parser.add_argument(
        "--container",
        default=DEFAULT_CONTAINER_NAME,
        help="Docker container to dump from (default: %(default)s).",
    )
    parser.add_argument(
        "--refresh-volatile",
        action="store_true",
        help="Take volatile timestamp fields from the new dump instead of "
        "preserving them from the existing output file.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parsed_args = _build_parser().parse_args(argv)

    if parsed_args.from_file:
        records = json.loads(parsed_args.from_file.read_text())
    elif parsed_args.from_stdin:
        records = json.loads(sys.stdin.read())
    else:
        records = dump_from_container(parsed_args.container)

    reference_dump: list[dict[str, Any]] | None = None
    output_path: Path | None = (
        None if parsed_args.output == STDOUT_SENTINEL else Path(parsed_args.output)
    )
    if not parsed_args.refresh_volatile and output_path is not None and output_path.exists():
        reference_dump = json.loads(output_path.read_text())

    normalized = normalize(records, reference=reference_dump)
    serialized = json.dumps(normalized, indent=2, ensure_ascii=False)

    if output_path is None:
        print(serialized)
    else:
        output_path.write_text(serialized + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
