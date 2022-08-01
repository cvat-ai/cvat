from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from .models import Webhook
from .serializers import WebhookReadSerializer, WebhookWriteSerializer
from rest_framework.permissions import SAFE_METHODS
from rest_framework import viewsets


@extend_schema(tags=["webhooks"])
@extend_schema_view(
    retrieve=extend_schema(
        summary="Method returns details of a webhook",
        responses={"200": WebhookReadSerializer},
    ),
    list=extend_schema(
        summary="Method returns a paginated list of webhook according to query parameters",
        responses={"200": WebhookReadSerializer(many=True)},
    ),
    update=extend_schema(
        summary="Method updates a webhook by id",
        responses={"200": WebhookWriteSerializer},
    ),
    partial_update=extend_schema(
        summary="Methods does a partial update of chosen fields in a webhook",
        responses={"200": WebhookWriteSerializer},
    ),
    create=extend_schema(
        summary="Method creates a webhook", responses={"201": WebhookWriteSerializer}
    ),
    destroy=extend_schema(
        summary="Method deletes a webhook",
        responses={"204": OpenApiResponse(description="The webhook has been deleted")},
    ),
)
class WebhookViewSet(viewsets.ModelViewSet):
    queryset = Webhook.objects.all()
    ordering = "-id"
    http_method_names = ["get", "post", "delete", "patch", "put"]

    search_fields = ("url", "owner", "type")
    filter_fields = list(search_fields) + ["id"]
    ordering_fields = filter_fields
    lookup_fields = {"owner": "owner__username"}
    iam_organization_field = "organization"

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return WebhookReadSerializer
        else:
            return WebhookWriteSerializer
