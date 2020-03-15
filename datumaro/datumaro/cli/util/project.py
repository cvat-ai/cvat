
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

from datumaro.components.project import Project


def load_project(project_dir):
    return Project.load(project_dir)

def generate_next_dir_name(dirname, basedir='.', sep='.'):
    """
    If basedir does not contain dirname, returns dirname itself,
    else generates a dirname by appending separator to the dirname
    and the number, next to the last used number in the basedir for
    files with dirname prefix.
    """

    def _to_int(s):
        try:
            return int(s)
        except Exception:
            return 0
    sep_count = dirname.count(sep) + 2

    files = [e for e in os.listdir(basedir) if e.startswith(dirname)]
    if files:
        files = [e.split(sep) for e in files]
        files = [_to_int(e[-1]) for e in files if len(e) == sep_count]
        dirname += '%s%s' % (sep, max(files, default=0) + 1)
    return dirname