
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

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
        parser.add_argument('-c', '--config',
            help="Path to the launcher configuration file (.yml)")
        return parser

    def __init__(self, config_path, model_dir=None):
        with open(osp.join(model_dir, config_path), 'r') as f:
            config = yaml.safe_load(f)
        self._launcher = _GenericAcLauncher.from_cmdline(config)

    def launch(self, inputs):
        return self._launcher.launch()

    def preferred_input_size(self):
        return self._launcher.preferred_input_size()

    def categories(self):
        return self._launcher.categories()
