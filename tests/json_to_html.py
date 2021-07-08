#!/usr/bin/env python

# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from json2html import *
import sys
import os
import json

def json_to_html(path_to_json):
    with open(path_to_json) as json_file:
        data = json.load(json_file)
    hadolint_html_report = json2html.convert(json = data)

    with open(os.path.splitext(path_to_json)[0] + '.html', 'w') as html_file:
        html_file.write(hadolint_html_report)


if __name__ == '__main__':
    json_to_html(sys.argv[1])
