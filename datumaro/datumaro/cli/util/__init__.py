
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import textwrap


class CliException(Exception): pass

def add_subparser(subparsers, name, builder):
    return builder(lambda **kwargs: subparsers.add_parser(name, **kwargs))

class MultilineFormatter(argparse.HelpFormatter):
    """
    Keeps line breaks introduced with '|n' separator
    and spaces introduced with '|s'.
    """

    def __init__(self, keep_natural=False, **kwargs):
        super().__init__(**kwargs)
        self._keep_natural = keep_natural

    def _fill_text(self, text, width, indent):
        text = self._whitespace_matcher.sub(' ', text).strip()
        text = text.replace('|s', ' ')

        paragraphs = text.split('|n ')
        if self._keep_natural:
            paragraphs = sum((p.split('\n ') for p in paragraphs), [])

        multiline_text = ''
        for paragraph in paragraphs:
            formatted_paragraph = textwrap.fill(paragraph, width,
                initial_indent=indent, subsequent_indent=indent) + '\n'
            multiline_text += formatted_paragraph
        return multiline_text

def required_count(nmin=0, nmax=0):
    assert 0 <= nmin and 0 <= nmax and nmin or nmax

    class RequiredCount(argparse.Action):
        def __call__(self, parser, args, values, option_string=None):
            k = len(values)
            if not ((nmin and (nmin <= k) or not nmin) and \
                    (nmax and (k <= nmax) or not nmax)):
                msg = "Argument '%s' requires" % self.dest
                if nmin and nmax:
                    msg += " from %s to %s arguments" % (nmin, nmax)
                elif nmin:
                    msg += " at least %s arguments" % nmin
                else:
                    msg += " no more %s arguments" % nmax
                raise argparse.ArgumentTypeError(msg)
            setattr(args, self.dest, values)
    return RequiredCount

def at_least(n):
    return required_count(n, 0)

def make_file_name(s):
    # adapted from
    # https://docs.djangoproject.com/en/2.1/_modules/django/utils/text/#slugify
    """
    Normalizes string, converts to lowercase, removes non-alpha characters,
    and converts spaces to hyphens.
    """
    import unicodedata, re
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore')
    s = s.decode()
    s = re.sub(r'[^\w\s-]', '', s).strip().lower()
    s = re.sub(r'[-\s]+', '-', s)
    return s