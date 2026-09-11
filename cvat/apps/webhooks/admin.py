# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict

from django import forms
from django.contrib import admin

from .event_type import AllEvents
from .models import Webhook
from .serializers import WebhookWriteSerializer


def grouped_event_choices() -> dict[str, list[tuple[str, str]]]:
    keys_by_group: dict[str, list[str]] = defaultdict(list)
    for event in AllEvents.events:
        keys_by_group[event.group.display_name].append(event.key)

    return {
        group: [(key, key) for key in sorted(keys)] for group, keys in sorted(keys_by_group.items())
    }


class WebhookAdminForm(forms.ModelForm):
    events = forms.MultipleChoiceField(
        choices=grouped_event_choices(),
        widget=forms.CheckboxSelectMultiple(attrs={"class": "webhook-events"}),
        required=False,
    )

    class Meta:
        model = Webhook
        fields = (
            "target_url",
            "description",
            "type",
            "project",
            "organization",
            "content_type",
            "secret",
            "enable_ssl",
            "is_active",
            "events",
        )

    class Media:
        css = {"all": ("webhooks/webhook_admin.css",)}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # The model FKs are null=True but not blank=True, so the ModelForm makes them required.
        for field_name in ("project", "organization"):
            if field_name in self.fields:
                self.fields[field_name].required = False

        if self.instance.pk:
            self.initial["events"] = self.instance.events.split(",") if self.instance.events else []

    def clean(self):
        cleaned_data = super().clean()
        if self.errors:
            return cleaned_data

        events = sorted(cleaned_data["events"])
        cleaned_data["events"] = ",".join(events)

        is_update = self.instance.pk is not None

        if is_update:
            webhook_type, project = self.instance.type, self.instance.project
        else:
            webhook_type, project = cleaned_data["type"], cleaned_data["project"]

        serializer = WebhookWriteSerializer(
            instance=self.instance if is_update else None,
            data={
                "target_url": cleaned_data["target_url"],
                "description": cleaned_data["description"],
                "content_type": cleaned_data["content_type"],
                "secret": cleaned_data["secret"],
                "is_active": cleaned_data["is_active"],
                "enable_ssl": cleaned_data["enable_ssl"],
                "type": webhook_type,
                "events": events,
                "project_id": project.pk if project else None,
            },
        )
        if not serializer.is_valid():
            for field_name, messages in serializer.errors.items():
                self.add_error(field_name if field_name in self.fields else None, list(messages))

        return cleaned_data


class WebhookAdmin(admin.ModelAdmin):
    form = WebhookAdminForm

    list_display = (
        "id",
        "target_url",
        "type",
        "is_active",
        "project",
        "organization",
        "owner",
        "created_date",
    )
    list_filter = ("type", "is_active")
    search_fields = ("target_url",)
    autocomplete_fields = ("project", "organization")

    def get_readonly_fields(self, request, obj=None):
        if obj is not None:
            return ("type", "project", "organization")
        return ()

    def save_model(self, request, obj, form, change):
        if not change:
            obj.owner = request.user
        super().save_model(request, obj, form, change)


admin.site.register(Webhook, WebhookAdmin)
