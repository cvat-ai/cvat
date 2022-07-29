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
    create=extend_schema(
        summary="Method creates an webhook", responses={"201": WebhookWriteSerializer}
    ),
)
class WebhookViewSet(viewsets.ModelViewSet):
    queryset = Webhook.objects.all()
    ordering = "-id"
    http_method_names = ["get", "post"]
    # TO-DO: setting search, filter fields etc

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return WebhookReadSerializer
        else:
            return WebhookWriteSerializer
