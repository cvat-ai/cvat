
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
from enum import Enum

from datumaro.components.project import Project
from datumaro.util.image import load_image


TargetKinds = Enum('TargetKinds',
    ['project', 'source', 'external_dataset', 'inference', 'image'])

def is_project_name(value, project):
    return value == project.config.project_name

def is_project_path(value):
    if value:
        try:
            Project.load(value)
            return True
        except Exception:
            pass
    return False

def is_project(value, project=None):
    if is_project_path(value):
        return True
    elif project is not None:
        return is_project_name(value, project)

    return False

def is_source(value, project=None):
    if project is not None:
        try:
            project.get_source(value)
            return True
        except KeyError:
            pass

    return False

def is_external_source(value):
    return False

def is_inference_path(value):
    return False

def is_image_path(value):
    try:
        return load_image(value) is not None
    except Exception:
        return False


class Target:
    def __init__(self, kind, test, is_default=False, name=None):
        self.kind = kind
        self.test = test
        self.is_default = is_default
        self.name = name

    def _get_fields(self):
        return [self.kind, self.test, self.is_default, self.name]

    def __str__(self):
        return self.name or str(self.kind)

    def __len__(self):
        return len(self._get_fields())

    def __iter__(self):
        return iter(self._get_fields())

def ProjectTarget(kind=TargetKinds.project, test=None,
        is_default=False, name='project name or path',
        project=None):
    if test is None:
        test = lambda v: is_project(v, project=project)
    return Target(kind, test, is_default, name)

def SourceTarget(kind=TargetKinds.source, test=None,
        is_default=False, name='source name',
        project=None):
    if test is None:
        test = lambda v: is_source(v, project=project)
    return Target(kind, test, is_default, name)

def ExternalDatasetTarget(kind=TargetKinds.external_dataset,
        test=is_external_source,
        is_default=False, name='external dataset path'):
    return Target(kind, test, is_default, name)

def InferenceTarget(kind=TargetKinds.inference, test=is_inference_path,
        is_default=False, name='inference path'):
    return Target(kind, test, is_default, name)

def ImageTarget(kind=TargetKinds.image, test=is_image_path,
            is_default=False, name='image path'):
    return Target(kind, test, is_default, name)


def target_selector(*targets):
    def selector(value):
        for (kind, test, is_default, _) in targets:
            if (is_default and (value == '' or value is None)) or test(value):
                return (kind, value)
        raise argparse.ArgumentTypeError('Value should be one of: %s' \
            % (', '.join([str(t) for t in targets])))
    return selector
