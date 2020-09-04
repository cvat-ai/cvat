
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import re

from datumaro.components.project import Project
from datumaro.util import cast


def load_project(project_dir):
    return Project.load(project_dir)

def generate_next_file_name(basename, basedir='.', sep='.', ext=''):
    """
    If basedir does not contain basename, returns basename,
    otherwise generates a name by appending sep to the basename
    and the number, next to the last used number in the basedir for
    files with basename prefix. Optionally, appends ext.
    """

    return generate_next_name(os.listdir(basedir), basename, sep, ext)

def generate_next_name(names, basename, sep='.', suffix='', default=None):
    pattern = re.compile(r'%s(?:%s(\d+))?%s' % \
        tuple(map(re.escape, [basename, sep, suffix])))
    matches = [match for match in (pattern.match(n) for n in names) if match]

    max_idx = max([cast(match[1], int, 0) for match in matches], default=None)
    if max_idx is None:
        if default is not None:
            idx = sep + str(default)
        else:
            idx = ''
    else:
        idx = sep + str(max_idx + 1)
    return basename + idx + suffix