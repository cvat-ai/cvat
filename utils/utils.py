# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: The strtobool function should be reimplemented since the distutils module is deprecated
# See details in PEP 632 – https://peps.python.org/pep-0632/#migration-advice
def strtobool(val: str) -> bool:
    """Convert a string representation of truth to true or false.

    True values are 'y', 'yes', 't', 'true', 'on', and '1'; false values
    are 'n', 'no', 'f', 'false', 'off', and '0'.  Raises ValueError if
    'val' is anything else.
    """
    val = val.lower()
    if val in ('y', 'yes', 't', 'true', 'on', '1'):
        return True
    elif val in ('n', 'no', 'f', 'false', 'off', '0'):
        return False
    else:
        raise ValueError("invalid truth value {!r}".format(val))