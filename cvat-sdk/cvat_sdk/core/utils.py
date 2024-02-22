# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import itertools
import os
from typing import (
    IO,
    Any,
    BinaryIO,
    ContextManager,
    Dict,
    Iterator,
    Literal,
    Sequence,
    TextIO,
    Union,
    overload,
)


def filter_dict(
    d: Dict[str, Any], *, keep: Sequence[str] = None, drop: Sequence[str] = None
) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if (not keep or k in keep) and (not drop or k not in drop)}


@overload
def atomic_writer(
    path: Union[os.PathLike, str], mode: Literal["wb"]
) -> ContextManager[BinaryIO]: ...


@overload
def atomic_writer(
    path: Union[os.PathLike, str], mode: Literal["w"], encoding: str = "UTF-8"
) -> ContextManager[TextIO]: ...


@contextlib.contextmanager
def atomic_writer(
    path: Union[os.PathLike, str], mode: Literal["w", "wb"], encoding: str = "UTF-8"
) -> Iterator[IO]:
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
    except:
        os.unlink(tmp_path)
        raise
