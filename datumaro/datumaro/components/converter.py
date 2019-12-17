
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

class Converter:
    def __init__(self, cmdline_args=None):
        pass

    def __call__(self, extractor, save_dir):
        raise NotImplementedError()

    def _parse_cmdline(self, cmdline):
        parser = self.build_cmdline_parser()

        if len(cmdline) != 0 and cmdline[0] == '--':
            cmdline = cmdline[1:]
        args = parser.parse_args(cmdline)
        return vars(args)