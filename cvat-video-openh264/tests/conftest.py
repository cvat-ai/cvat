# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "src"))
