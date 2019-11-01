
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.config import Config, \
    DefaultConfig as _DefaultConfig, \
    SchemaBuilder as _SchemaBuilder


SOURCE_SCHEMA = _SchemaBuilder() \
    .add('url', str) \
    .add('format', str) \
    .add('options', str) \
    .build()

class Source(Config):
    def __init__(self, config=None):
        super().__init__(config, schema=SOURCE_SCHEMA)


MODEL_SCHEMA = _SchemaBuilder() \
    .add('launcher', str) \
    .add('model_dir', str, internal=True) \
    .add('options', dict) \
    .build()

class Model(Config):
    def __init__(self, config=None):
        super().__init__(config, schema=MODEL_SCHEMA)


ENV_SCHEMA = _SchemaBuilder() \
    .add('models_dir', str) \
    .add('importers_dir', str) \
    .add('launchers_dir', str) \
    .add('converters_dir', str) \
    .add('extractors_dir', str) \
    \
    .add('models', lambda: _DefaultConfig(
        lambda v=None: Model(v))) \
    .build()

ENV_DEFAULT_CONFIG = Config({
    'models_dir': 'models',
    'importers_dir': 'importers',
    'launchers_dir': 'launchers',
    'converters_dir': 'converters',
    'extractors_dir': 'extractors',
}, mutable=False, schema=ENV_SCHEMA)


PROJECT_SCHEMA = _SchemaBuilder() \
    .add('project_name', str) \
    .add('format_version', int) \
    \
    .add('sources_dir', str) \
    .add('dataset_dir', str) \
    .add('build_dir', str) \
    .add('subsets', list) \
    .add('sources', lambda: _DefaultConfig(
        lambda v=None: Source(v))) \
    .add('filter', str) \
    \
    .add('project_filename', str, internal=True) \
    .add('project_dir', str, internal=True) \
    .add('env_filename', str, internal=True) \
    .add('env_dir', str, internal=True) \
    .build()

PROJECT_DEFAULT_CONFIG = Config({
    'project_name': 'undefined',
    'format_version': 1,

    'sources_dir': 'sources',
    'dataset_dir': 'dataset',
    'build_dir': 'build',

    'project_filename': 'config.yaml',
    'project_dir': '',
    'env_filename': 'datumaro.yaml',
    'env_dir': '.datumaro',
}, mutable=False, schema=PROJECT_SCHEMA)
