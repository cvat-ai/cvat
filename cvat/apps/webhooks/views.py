# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from cvat.apps.iam.permissions import WebhookPermission

from .event_type import AllEvents, OrganizationEvents, ProjectEvents
from .models import Webhook, WebhookDelivery, WebhookTypeChoice
from .serializers import (
    EventsSerializer,
    WebhookDeliveryReadSerializer,
    WebhookReadSerializer,
    WebhookWriteSerializer,
)
from .signals import signal_ping, signal_redelivery


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

    search_fields = ("target_url", "owner", "type", "description")
    filter_fields = list(search_fields) + ["id", "project_id", "updated_date"]
    ordering_fields = filter_fields
    lookup_fields = {"owner": "owner__username"}
    iam_organization_field = "organization"

    def get_serializer_class(self):
        if self.request.path.endswith("redelivery") or self.request.path.endswith(
            "ping"
        ):
            return None
        else:
            if self.request.method in SAFE_METHODS:
                return WebhookReadSerializer
            else:
                return WebhookWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            perm = WebhookPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context["organization"],
        )

    @extend_schema(
        summary="Method return a list of available webhook events",
        parameters=[
            OpenApiParameter(
                "type",
                description="Type of webhook",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                required=False,
            )
        ],
        responses={"200": OpenApiResponse(EventsSerializer)},
    )
    @action(detail=False, methods=["GET"], serializer_class=EventsSerializer)
    def events(self, request):
        webhook_type = request.query_params.get("type", "all")
        events = None
        if webhook_type == "all":
            events = AllEvents
        elif webhook_type == WebhookTypeChoice.PROJECT:
            events = ProjectEvents
        elif webhook_type == WebhookTypeChoice.ORGANIZATION:
            events = OrganizationEvents

        if events is None:
            return Response(
                "Incorrect value of type parameter", status=status.HTTP_400_BAD_REQUEST
            )

        return Response(EventsSerializer().to_representation(events))

    @extend_schema(
        summary="Method return a list of deliveries for a specific webhook",
        responses={"200": WebhookDeliveryReadSerializer(many=True)},
    )
    @action(
        detail=True, methods=["GET"], serializer_class=WebhookDeliveryReadSerializer
    )
    def deliveries(self, request, pk):
        self.get_object()
        queryset = WebhookDelivery.objects.filter(webhook_id=pk).order_by(
            "-updated_date"
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = WebhookDeliveryReadSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = WebhookDeliveryReadSerializer(
            queryset, many=True, context={"request": request}
        )

        return Response(serializer.data)

    @extend_schema(
        summary="Method return a specific delivery for a specific webhook",
        responses={"200": WebhookDeliveryReadSerializer},
    )
    @action(
        detail=True,
        methods=["GET"],
        url_path=r"deliveries/(?P<delivery_id>\d+)",
        serializer_class=WebhookDeliveryReadSerializer,
    )
    def retrieve_delivery(self, request, pk, delivery_id):
        self.get_object()
        queryset = WebhookDelivery.objects.get(webhook_id=pk, id=delivery_id)
        serializer = WebhookDeliveryReadSerializer(
            queryset, context={"request": request}
        )
        return Response(serializer.data)

    @extend_schema(summary="Method redeliver a specific webhook delivery")
    @action(
        detail=True,
        methods=["POST"],
        url_path=r"deliveries/(?P<delivery_id>\d+)/redelivery",
    )
    def redelivery(self, request, pk, delivery_id):
        delivery = WebhookDelivery.objects.get(webhook_id=pk, id=delivery_id)
        signal_redelivery.send(sender=self, data=delivery.request)

        # Questionable: should we provide a body for this response?
        return Response({})

    @extend_schema(
        summary="Method send ping webhook",
        responses={"200": WebhookDeliveryReadSerializer},
    )
    @action(
        detail=True, methods=["POST"], serializer_class=WebhookDeliveryReadSerializer
    )
    def ping(self, request, pk):
        instance = self.get_object()
        serializer = WebhookReadSerializer(instance, context={"request": request})

        delivery = signal_ping.send(sender=self, serializer=serializer)[0][1]
        serializer = WebhookDeliveryReadSerializer(
            delivery, context={"request": request}
        )
        return Response(serializer.data)
