# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from datetime import timedelta

from attr.converters import to_bool

GITHUB_STAR_PROMPT_COOLDOWN = timedelta(days=30)
GITHUB_STAR_PROMPT_POLICY = "cvat.apps.growth.policies.EnabledGitHubStarPromptPolicy"

# Content is fetched at runtime; publishing documentation does not deploy CVAT.
CVAT_UPDATES_ENABLED = to_bool(os.getenv("CVAT_UPDATES_ENABLED", False))
CVAT_UPDATES_SOURCE_URL = os.getenv("CVAT_UPDATES_SOURCE_URL", "https://docs.cvat.ai/")
CVAT_UPDATES_PUBLIC_URL = os.getenv("CVAT_UPDATES_PUBLIC_URL", CVAT_UPDATES_SOURCE_URL)
CVAT_UPDATES_CACHE_TTL = int(os.getenv("CVAT_UPDATES_CACHE_TTL", "900"))
# Deployments supply the identifier used to match content audience metadata.
CVAT_UPDATES_EDITION = os.getenv("CVAT_UPDATES_EDITION", "community")
# Optional callable returning normalized previews from an additional source.
CVAT_UPDATES_ANNOUNCEMENT_PROVIDER = None
