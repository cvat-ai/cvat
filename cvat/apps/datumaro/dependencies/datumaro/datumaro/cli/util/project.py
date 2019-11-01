
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp

from datumaro.components.project import Project, \
    PROJECT_DEFAULT_CONFIG as DEFAULT_CONFIG


def make_project_path(project_dir, project_filename=None):
    if project_filename is None:
        project_filename = DEFAULT_CONFIG.project_filename
    return osp.join(project_dir, project_filename)

def load_project(project_dir, project_filename=None):
    return Project.load(project_dir)