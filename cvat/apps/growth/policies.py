# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, abstractmethod
from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.utils.module_loading import import_string
from django.utils.timezone import now

from cvat.apps.organizations.models import Organization

from .models import UserGrowthData


class GitHubStarPromptPolicy(ABC):
    @abstractmethod
    def is_enabled(
        self,
        user: User,
        organization: Organization | None,
        growth_data: UserGrowthData,
        current_time: datetime,
    ) -> bool:
        pass


class EnabledGitHubStarPromptPolicy(GitHubStarPromptPolicy):
    def is_enabled(
        self,
        user: User,
        organization: Organization | None,
        growth_data: UserGrowthData,
        current_time: datetime,
    ) -> bool:
        return True


class DisabledGitHubStarPromptPolicy(GitHubStarPromptPolicy):
    def is_enabled(
        self,
        user: User,
        organization: Organization | None,
        growth_data: UserGrowthData,
        current_time: datetime,
    ) -> bool:
        return False


def is_github_prompt_on_cooldown(
    growth_data: UserGrowthData,
    current_time: datetime | None = None,
) -> bool:
    if growth_data.github_prompt_shown_at is None:
        return False

    current_time = current_time or now()
    return current_time < growth_data.github_prompt_shown_at + settings.GITHUB_STAR_PROMPT_COOLDOWN


def is_github_prompt_enabled(
    user: User,
    organization: Organization | None,
    growth_data: UserGrowthData,
    current_time: datetime | None = None,
) -> bool:
    current_time = current_time or now()
    policy = import_string(settings.GITHUB_STAR_PROMPT_POLICY)()

    return (
        policy.is_enabled(user, organization, growth_data, current_time)
        and growth_data.promotion_notifications_allowed
        and not growth_data.github_prompt_support_clicked
        and not is_github_prompt_on_cooldown(growth_data, current_time)
    )
