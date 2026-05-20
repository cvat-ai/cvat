# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from pathlib import Path, PurePath
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from _typeshed import StrPath


def problem_with_untrusted_path(
    untrusted_path: str, /, *, allow_trailing_slash: bool = False
) -> str | None:
    """
    If untrusted_path is a valid relative path in canonical form, returns None.
    Otherwise, returns a string describing the problem.
    """

    p = PurePath(untrusted_path)
    if not p.parts:
        return "path is empty"

    if p.root or p.drive:
        return "path is not relative"

    if ".." in p.parts:
        return "path contains a '..' segment"

    if untrusted_path.endswith("/") and not allow_trailing_slash:
        return "path has a trailing slash"

    if p.as_posix() != untrusted_path.removesuffix("/"):
        return "path is not in canonical form"

    return None


def join_untrusted_path(root: StrPath, untrusted_path: StrPath, /) -> Path:
    """
    Returns the result of joining root and untrusted_path, if the result is a child of root.
    Otherwise, raises ValueError.

    This function should be used as a second line of defense against path traversal attacks.
    If possible, any paths received from the user should first be validated with problem_with_untrusted_path,
    which doesn't require a root and provides more specific error messages.
    """

    joined = Path(root, untrusted_path).resolve()
    joined.relative_to(root)  # Will raise ValueError if joined is not a child of root.
    return joined
