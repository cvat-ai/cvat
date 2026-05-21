# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import sys
from pathlib import Path

# NOTE @sosov: Put repo root on sys.path so tests can `from cvat... import ...`. pytest.ini's
# `pythonpath =` would replace this, but it requires pytest 7.0+ (we're on 6.2.5).
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Force execution of fixture definitions
from shared.fixtures.data import *  # noqa: E402 pylint: disable=wildcard-import
from shared.fixtures.init import *  # noqa: E402 pylint: disable=wildcard-import
from shared.fixtures.s3 import *  # noqa: E402 pylint: disable=wildcard-import
from shared.fixtures.util import *  # noqa: E402 pylint: disable=wildcard-import
