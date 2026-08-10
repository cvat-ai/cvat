# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict

from django import forms
from django.contrib import admin

from cvat.apps.webhooks.event_type import Event, InstanceEvents

from .models import Webhook, WebhookTypeChoice


class EventGroupsFormField(forms.MultipleChoiceField):
    def __init__(self, events: list[Event], **kwargs):
        self.events_by_group: dict[str, list[str]] = defaultdict(list)
        for event in events:
            self.events_by_group[event.group.display_name].append(event.key)

        super().__init__(
            choices=((group, group) for group in sorted(self.events_by_group)),
            **kwargs,
        )

    def prepare_value(self, value):
        if isinstance(value, str):
            selected_events = set(value.split(","))
            return [
                group
                for group, event_keys in self.events_by_group.items()
                if selected_events.intersection(event_keys)
            ]

        return super().prepare_value(value)

    def clean(self, value):
        selected_groups = super().clean(value)
        selected_events = {
            event_key for group in selected_groups for event_key in self.events_by_group[group]
        }
        return ",".join(sorted(selected_events))


class WebhookAdminForm(forms.ModelForm):
    events = EventGroupsFormField(
        events=InstanceEvents.events,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = Webhook
        fields = (
            "target_url",
            "description",
            "content_type",
            "secret",
            "enable_ssl",
            "is_active",
            "events",
        )

    def save(self, commit=True):
        webhook = super().save(commit=False)
        webhook.type = WebhookTypeChoice.INSTANCE
        webhook.project_id = None
        webhook.organization_id = None

        if commit:
            webhook.save()

        return webhook


class WebhookAdmin(admin.ModelAdmin):
    form = WebhookAdminForm

    def get_queryset(self, request):
        return super().get_queryset(request).filter(type=WebhookTypeChoice.INSTANCE)


admin.site.register(Webhook, WebhookAdmin)
