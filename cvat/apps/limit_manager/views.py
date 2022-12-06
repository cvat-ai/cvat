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


class LimitationViewSet(viewsets.ViewSet):
    def get_serializer_class(self):
        is_org = bool(self.request.iam_context["organization"])
        if is_org and self.request.method in SAFE_METHODS:
            return OrgLimitationReadSerializer
        elif is_org and self.request.method not in SAFE_METHODS:
            return OrgLimitationWriteSerializer
        elif not is_org and self.request.method in SAFE_METHODS:
            return UserLimitationReadSerializer
        else:
            return UserLimitationWriteSerializer

    def partial_update(self, request, pk):
        instance = Limitation.objects.get(id=pk)
        # TO-DO: fix serializer here
        serializer = self.get_serializer_class()(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_200_OK)

    # TO-DO:
    #   - only admin method
    #   - pagination
    #   - return single limitation via query params
    #   - validate user_id: User.DoesNotExists
    def list(self, request):
        user_id = request.user.id
        user_id = request.query_params.get("user_id")
        org_id = getattr(request.iam_context["organization"], "id", None)

        if user_id and org_id:
            raise exceptions.ParseError("user_id and org_id cannot be used together")

        if not user_id and not org_id:
            raise exceptions.ParseError("list of limitations for all users: not implemented yet")

        instance = LimitManager()._get_or_create_limitation(user_id=user_id, org_id=org_id)

        data = self.get_serializer_class()(
            context={"request": request}
        ).to_representation(instance)
        return Response(data, status=status.HTTP_200_OK)

    @action(methods=["GET"], detail=False)
    def default(self, request):
        # TO-DO: admin only method
        serializer = (
            DefaultUserLimitationSerializer()
            if "org" not in request.query_params
            else DefaultOrgLimitationSerializer()
        )
        data = serializer.to_representation(instance=Limitation())
        return Response(data, status=status.HTTP_200_OK)
