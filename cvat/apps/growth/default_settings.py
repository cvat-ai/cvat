# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta

GITHUB_STAR_PROMPT_COOLDOWN = timedelta(days=30)
GITHUB_STAR_PROMPT_POLICY = "cvat.apps.growth.policies.EnabledGitHubStarPromptPolicy"
