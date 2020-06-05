
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import subprocess


def check_instruction_set(instruction):
    return instruction == str.strip(
        # Let's ignore a warning from bandit about using shell=True.
        # In this case it isn't a security issue and we use some
        # shell features like pipes.
        subprocess.check_output(
            'lscpu | grep -o "%s" | head -1' % instruction,
            shell=True).decode('utf-8') # nosec
    )