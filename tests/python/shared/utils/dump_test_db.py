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

    # read pre-existing dump from a file (or stdin via "-") instead of
    # running docker exec
    python tests/python/shared/utils/dump_test_db.py --from-file dump.json

    # also refresh volatile fields (don't preserve from existing output)
    python tests/python/shared/utils/dump_test_db.py --refresh-volatile

    # write to a custom location / stdout
    python tests/python/shared/utils/dump_test_db.py -o /tmp/data.json
    python tests/python/shared/utils/dump_test_db.py -o -

    # extend the built-in volatile/sortable maps and dumpdata excludes
    # from a JSON file (e.g. when running against a Django project that
    # adds models beyond the OSS apps covered by this script or you want
    # to customize the dump).
    python tests/python/shared/utils/dump_test_db.py \\
        --extra-config path/to/dump_extra_config.json

The extra config file has up to three optional sections:

    {
      "extra_volatile_fields":      { "<model>": ["<field>", ...], ... },
      "extra_sortable_list_fields": { "<model>": ["<field>", ...], ... },
      "extra_excludes":             ["<app_or_app.model>", ...]
    }

Field maps union with the built-in entries per model;
``extra_excludes`` append to ``DUMPDATA_EXCLUDES`` (and are ignored
when ``--from-file`` is used, since the dump is already produced).
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
    "quality_control.qualityreport": frozenset(
        {"assignee_last_updated", "gt_last_updated", "target_last_updated"}
    ),
    "access_tokens.accesstoken": frozenset({"last_used_date"}),
}


# Any field whose name is exactly ``updated_date`` or ends with
# ``_updated_date`` is treated as volatile for every model. ``auto_now``
# timestamps drift on every save and the exact value is not relevant for
# tests, so we don't track the per-model list of such fields explicitly.
def _is_blanket_volatile(field_name: str) -> bool:
    return field_name == "updated_date" or field_name.endswith("_updated_date")


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

_DEFAULT = object()


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


def _normalize_record(
    record: dict[str, Any],
    *,
    sortable_list_fields: dict[str, frozenset[str]] | Any = _DEFAULT,
) -> dict[str, Any]:
    if sortable_list_fields is _DEFAULT:
        sortable_list_fields = SORTABLE_LIST_FIELDS

    model = record.get("model", "")
    fields = record.get("fields", {})
    sortable = sortable_list_fields.get(model, frozenset())

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
    records: list[dict[str, Any]],
    reference: list[dict[str, Any]],
    *,
    volatile_fields: dict[str, frozenset[str]] | Any = _DEFAULT,
) -> list[dict[str, Any]]:
    if volatile_fields is _DEFAULT:
        volatile_fields = VOLATILE_FIELDS

    ref_index = {
        (r.get("model", ""), _pk_sort_key(r.get("pk"))): r.get("fields", {}) for r in reference
    }

    for record in records:
        model = record.get("model", "")
        ref_fields = ref_index.get((model, _pk_sort_key(record.get("pk"))))
        if ref_fields is None:
            continue

        explicit = volatile_fields.get(model, frozenset())
        fields = record.get("fields", {})
        for name in fields:
            if name not in ref_fields:
                continue
            if name in explicit or _is_blanket_volatile(name):
                fields[name] = ref_fields[name]

    return records


def normalize(
    records: list[dict[str, Any]],
    *,
    reference: list[dict[str, Any]] | None = None,
    volatile_fields: dict[str, frozenset[str]] | Any = _DEFAULT,
    sortable_list_fields: dict[str, frozenset[str]] | Any = _DEFAULT,
) -> list[dict[str, Any]]:
    """Return ``records`` sorted and field-normalized, with volatile fields
    optionally preserved from ``reference``."""

    if volatile_fields is _DEFAULT:
        volatile_fields = VOLATILE_FIELDS

    if sortable_list_fields is _DEFAULT:
        sortable_list_fields = _DEFAULT

    normalized = [_normalize_record(r, sortable_list_fields=sortable_list_fields) for r in records]

    if reference is not None:
        _preserve_volatile(normalized, reference=reference, volatile_fields=volatile_fields)

    # Sort alphabetically by model name (then by pk) so the committed file
    # has a layout that doesn't depend on Django's dependency sort. The
    # ``loaddata_sorted`` management command reorders records by dependency
    # at load time, so any total ordering is fine here.
    normalized.sort(key=lambda r: (r.get("model", ""), _pk_sort_key(r.get("pk"))))
    return normalized


def dump_from_container(
    container: str = DEFAULT_CONTAINER_NAME,
    *,
    excludes: tuple[str, ...] | list[str] = DUMPDATA_EXCLUDES,
) -> list[dict[str, Any]]:
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
    for ex in excludes:
        cmd.extend(["--exclude", ex])

    proc = run(cmd, check=True, stdout=PIPE)  # nosec
    return json.loads(proc.stdout)


EXTRA_CONFIG_KEYS = ("extra_volatile_fields", "extra_sortable_list_fields", "extra_excludes")

# Conventional Django ``app_label.modelname`` shape: lowercase identifier on
# each side, joined by a single dot. Mismatch is a warning (not an error)
# because the script doesn't load Django and can't authoritatively validate
# model names — but the convention catches typos like ``engine.Task``.
_MODEL_NAME_RE = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")


class _ConfigError(ValueError):
    """Raised when ``--extra-config`` content is malformed."""


def _require_non_empty_str(value: Any, where: str) -> None:
    if not isinstance(value, str):
        raise _ConfigError(f"{where}: expected string, got {type(value).__name__}")
    if not value:
        raise _ConfigError(f"{where}: expected non-empty string")


def _validate_field_map(section: Any, where: str) -> None:
    if not isinstance(section, dict):
        raise _ConfigError(f"{where}: expected object, got {type(section).__name__}")
    for model, fields in section.items():
        _require_non_empty_str(model, f"{where} key")
        if not _MODEL_NAME_RE.match(model):
            print(
                f"warning: {where}.{model!r} does not match the conventional "
                "<app_label>.<model_lowercase> shape",
                file=sys.stderr,
            )
        if not isinstance(fields, list):
            raise _ConfigError(f"{where}.{model}: expected list, got {type(fields).__name__}")
        seen: set[str] = set()
        for i, field in enumerate(fields):
            _require_non_empty_str(field, f"{where}.{model}[{i}]")
            if field in seen:
                raise _ConfigError(f"{where}.{model}[{i}]: duplicate field {field!r}")
            seen.add(field)


def _validate_excludes(section: Any, where: str) -> None:
    if not isinstance(section, list):
        raise _ConfigError(f"{where}: expected list, got {type(section).__name__}")
    seen: set[str] = set()
    for i, item in enumerate(section):
        _require_non_empty_str(item, f"{where}[{i}]")
        if item in seen:
            raise _ConfigError(f"{where}[{i}]: duplicate exclude {item!r}")
        seen.add(item)


def _load_extra_config(path: Path) -> dict[str, Any]:
    """Read and validate an extension config file.

    See ``EXTRA_CONFIG_KEYS`` for the allowed top-level sections; missing
    sections default to empty. Malformed content raises ``_ConfigError``
    with a JSON-pointer-style path so the offending entry is easy to find.
    """
    raw = json.loads(path.read_text())
    if not isinstance(raw, dict):
        raise _ConfigError(f"{path}: top-level must be an object, got {type(raw).__name__}")
    unknown = sorted(set(raw) - set(EXTRA_CONFIG_KEYS))
    if unknown:
        raise _ConfigError(
            f"{path}: unknown top-level keys: {unknown}. " f"valid keys: {list(EXTRA_CONFIG_KEYS)}"
        )

    extra_volatile = raw.get("extra_volatile_fields", {})
    extra_sortable = raw.get("extra_sortable_list_fields", {})
    extra_excludes = raw.get("extra_excludes", [])

    _validate_field_map(extra_volatile, "extra_volatile_fields")
    _validate_field_map(extra_sortable, "extra_sortable_list_fields")
    _validate_excludes(extra_excludes, "extra_excludes")

    return {
        "extra_volatile_fields": extra_volatile,
        "extra_sortable_list_fields": extra_sortable,
        "extra_excludes": extra_excludes,
    }


def _merge_field_map(
    base: dict[str, frozenset[str]],
    extra: dict[str, list[str]],
) -> dict[str, frozenset[str]]:
    merged = dict(base)
    for model, fields in extra.items():
        merged[model] = merged.get(model, frozenset()) | frozenset(fields)
    return merged


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

    parser.add_argument(
        "--from-file",
        type=str,
        help="Read pre-existing dumpdata JSON from this file instead of running docker exec. "
        'Use "-" to read from stdin.',
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
    parser.add_argument(
        "--extra-config",
        type=Path,
        help="Path to a JSON file extending the built-in volatile/sortable "
        "maps and dumpdata excludes. Sections (all optional): "
        "extra_volatile_fields, extra_sortable_list_fields, extra_excludes. "
        "Field maps union with the built-in entries per model; "
        "extra_excludes append to the built-in DUMPDATA_EXCLUDES (and are "
        "ignored when --from-file is used).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parsed_args = _build_parser().parse_args(argv)

    if parsed_args.extra_config:
        try:
            extra = _load_extra_config(parsed_args.extra_config)
        except _ConfigError as exc:
            print(f"error: invalid --extra-config: {exc}", file=sys.stderr)
            return 2
    else:
        extra = {
            "extra_volatile_fields": {},
            "extra_sortable_list_fields": {},
            "extra_excludes": [],
        }
    volatile_fields = _merge_field_map(VOLATILE_FIELDS, extra["extra_volatile_fields"])
    sortable_list_fields = _merge_field_map(
        SORTABLE_LIST_FIELDS, extra["extra_sortable_list_fields"]
    )
    excludes = list(DUMPDATA_EXCLUDES) + [
        ex for ex in extra["extra_excludes"] if ex not in DUMPDATA_EXCLUDES
    ]
    if extra["extra_excludes"] and parsed_args.from_file:
        print(
            "warning: extra_excludes is ignored when reading the dump from "
            "--from-file (the dump is already produced).",
            file=sys.stderr,
        )

    if parsed_args.from_file == "-":
        records = json.loads(sys.stdin.read())
    elif parsed_args.from_file:
        records = json.loads(Path(parsed_args.from_file).read_text())
    else:
        records = dump_from_container(parsed_args.container, excludes=excludes)

    reference_dump: list[dict[str, Any]] | None = None
    output_path: Path | None = (
        None if parsed_args.output == STDOUT_SENTINEL else Path(parsed_args.output)
    )
    if not parsed_args.refresh_volatile and output_path is not None and output_path.exists():
        reference_dump = json.loads(output_path.read_text())

    normalized = normalize(
        records,
        reference=reference_dump,
        volatile_fields=volatile_fields,
        sortable_list_fields=sortable_list_fields,
    )
    serialized = json.dumps(normalized, indent=2, ensure_ascii=False)

    if output_path is None:
        print(serialized)
    else:
        output_path.write_text(serialized + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
