from rest_framework import exceptions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from .core.limits import LimitManager
from .models import Limitation
from .serializers import (
    OrgLimitationReadSerializer,
    OrgLimitationWriteSerializer,
    UserLimitationReadSerializer,
    UserLimitationWriteSerializer,
    DefaultUserLimitationSerializer,
    DefaultOrgLimitationSerializer
)


class LimitationViewSet(viewsets.GenericViewSet):
    def get_serializer_class(self, org=None):
        is_safe_method = self.request.method in SAFE_METHODS

        if org and is_safe_method:
            return OrgLimitationReadSerializer

        if org and not is_safe_method:
            return OrgLimitationWriteSerializer

        if not org and is_safe_method:
            return UserLimitationReadSerializer

        return UserLimitationWriteSerializer

    def partial_update(self, request, pk):
        try:
            instance = Limitation.objects.get(id=pk)
        except Limitation.DoesNotExist:
            raise exceptions.NotFound(f"Cannot find limitations with id {pk}")

        self.check_object_permissions(self.request, instance)

        serializer = self.get_serializer_class(instance.org)(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(status=status.HTTP_200_OK)

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        org_id = getattr(self.request.iam_context["organization"], "id", None)

        if not user_id and not org_id:
            raise exceptions.ParseError("Cannot get list of all limitations: not implemented yet")

        if user_id and org_id:
            raise exceptions.ParseError("Limitation could belong to user or to organization, but not both")

        if user_id and not user_id.isnumeric():
            raise exceptions.ParseError("Parameter 'user_id' must be integer")

        queryset = Limitation.objects.filter(user_id=user_id, org_id=org_id)
        if queryset.count() == 0:
            queryset = [LimitManager()._get_or_create_limitation(user_id=user_id, org_id=org_id)]

        return queryset

    def list(self, request):
        org_id = getattr(request.iam_context["organization"], "id", None)

        queryset = self.get_queryset()
        serializer = self.get_serializer_class(org_id)(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=["GET"], detail=False)
    def default(self, request):
        serializer = (
            DefaultUserLimitationSerializer()
            if "org" not in request.query_params
            else DefaultOrgLimitationSerializer()
        )
        data = serializer.to_representation(instance=Limitation())
        return Response(data, status=status.HTTP_200_OK)
