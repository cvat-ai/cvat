
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import yaml

from datumaro.components.cli_plugin import CliPlugin
from datumaro.components.launcher import Launcher

from .details.ac import GenericAcLauncher as _GenericAcLauncher


class AcLauncher(Launcher, CliPlugin):
    """
    Generic model launcher with Accuracy Checker backend.
    """

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-c', '--config', type=osp.abspath, required=True,
            help="Path to the launcher configuration file (.yml)")
        return parser

    def __init__(self, config, model_dir=None):
        model_dir = model_dir or ''
        with open(osp.join(model_dir, config), 'r') as f:
            config = yaml.safe_load(f)
        self._launcher = _GenericAcLauncher.from_config(config)

    def launch(self, inputs):
        return self._launcher.launch(inputs)

    def categories(self):
        return self._launcher.categories()
