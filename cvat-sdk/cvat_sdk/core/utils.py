# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import itertools
import os
from collections.abc import Generator, Sequence
from typing import IO, Any, BinaryIO, Literal, TextIO, overload

from cvat_sdk.core.exceptions import InvalidHostException


ALLOWED_SERVER_SCHEMAS = ("https", "http")


def normalize_server_url(url: str) -> str:
    """Add the default scheme and remove a trailing slash from a server URL."""
    match url.split("://", maxsplit=1):
        case [schema, _]:
            if schema not in ALLOWED_SERVER_SCHEMAS:
                raise InvalidHostException(
                    f"Invalid url schema '{schema}', expected "
                    f"one of <none>, {', '.join(ALLOWED_SERVER_SCHEMAS)}"
                )
        case _:
            url = "https://" + url

    return url.rstrip("/")


def is_posix() -> bool:
    return os.name == "posix"


def filter_dict(
    d: dict[str, Any], *, keep: Sequence[str] = None, drop: Sequence[str] = None
) -> dict[str, Any]:
    return {k: v for k, v in d.items() if (not keep or k in keep) and (not drop or k not in drop)}


@overload
def atomic_writer(
    path: os.PathLike | str, mode: Literal["wb"]
) -> contextlib.AbstractContextManager[BinaryIO]: ...


@overload
def atomic_writer(
    path: os.PathLike | str, mode: Literal["w"], encoding: str = "UTF-8"
) -> contextlib.AbstractContextManager[TextIO]: ...


@contextlib.contextmanager
def atomic_writer(
    path: os.PathLike | str, mode: Literal["w", "wb"], encoding: str = "UTF-8"
) -> Generator[IO, None, None]:
    """
    Returns a context manager that, when entered, returns a handle to a temporary
    file opened with the specified `mode` and `encoding`. If the context manager
    is exited via an exception, the temporary file is deleted. If the context manager
    is exited normally, the file is renamed to `path`.

    In other words, this function works like `open()`, but the file does not appear
    at the specified path until and unless the context manager is exited
    normally.
    """

    path_str = os.fspath(path)

    for counter in itertools.count():
        tmp_path = f"{path_str}.tmp{counter}"

        try:
            if mode == "w":
                tmp_file = open(tmp_path, "xt", encoding=encoding)
            elif mode == "wb":
                tmp_file = open(tmp_path, "xb")
            else:
                raise ValueError(f"Unsupported mode: {mode!r}")

            break
        except FileExistsError:
            pass  # try next counter value

    try:
        with tmp_file:
            yield tmp_file
        os.replace(tmp_path, path)
    except BaseException:
        os.unlink(tmp_path)
        raise
