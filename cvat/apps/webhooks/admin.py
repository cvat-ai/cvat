from .models import Webhook, WebhookDelivery

from django.contrib import admin


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ("status_code", "redelivery", "created_date", "event","changed_fields")
    list_filter = ("event",)
    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ("target_url", "description", "type", "content_type", "is_active")
