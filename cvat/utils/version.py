# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
#
# Note: It is slightly re-implemented Django version of code. We cannot use
# get_version from django.utils.version module because get_git_changeset will
# always return empty value (cwd=repo_dir isn't correct). Also it gives us a
# way to define the version as we like.

import datetime
import os
import subprocess


def get_version(version):
    """Return a PEP 440-compliant version number from VERSION."""
    # Now build the two parts of the version number:
    # main = X.Y.Z
    # sub = .devN - for pre-alpha releases
    #     | {a|b|rc}N - for alpha, beta, and rc releases

    main = get_main_version(version)

    sub = ""
    if version[3] == "alpha" and version[4] == 0:
        git_changeset = get_git_changeset()
        if git_changeset:
            sub = ".dev%s" % git_changeset

    elif version[3] != "final":
        mapping = {"alpha": "a", "beta": "b", "rc": "rc"}
        sub = mapping[version[3]] + str(version[4])

    return main + sub


def get_main_version(version):
    """Return main version (X.Y.Z) from VERSION."""
    return ".".join(str(x) for x in version[:3])


def get_git_changeset():
    """Return a numeric identifier of the latest git changeset.

    The result is the UTC timestamp of the changeset in YYYYMMDDHHMMSS format.
    This value isn't guaranteed to be unique, but collisions are very unlikely,
    so it's sufficient for generating the development version numbers.
    """
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    git_log = subprocess.Popen(  # nosec: B603, B607
        ["git", "log", "--pretty=format:%ct", "--quiet", "-1", "HEAD"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=repo_dir,
        universal_newlines=True,
    )
    timestamp = git_log.communicate()[0]
    try:
        timestamp = datetime.datetime.fromtimestamp(int(timestamp), tz=datetime.timezone.utc)
    except ValueError:
        return None
    return timestamp.strftime("%Y%m%d%H%M%S")
