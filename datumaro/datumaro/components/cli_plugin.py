
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse

from datumaro.cli.util import MultilineFormatter


class CliPlugin:
    @classmethod
    def build_cmdline_parser(cls, **kwargs):

        def get_name(cls):
            if hasattr(cls, 'NAME'):
                return cls.NAME
            else:
                name = cls.__name__[0].lower()
                for char in cls.__name__[1:]:
                    if char.isalpha() and char.isupper():
                        name.append('_')
                        name.append(char.lower())
                    else:
                        name.append(char)
                name = ''.join(name)
                return name

        def get_doc(cls):
            return getattr(cls, '__doc__', "")

        args = {
            'prog': get_name(cls),
            'description': get_doc(cls),
            'formatter_class': MultilineFormatter,
        }
        args.update(kwargs)

        return argparse.ArgumentParser(**args)

    @classmethod
    def from_cmdline(cls, args=None):
        parser = cls.build_cmdline_parser()
        args = parser.parse_args(args)
        return vars(args)