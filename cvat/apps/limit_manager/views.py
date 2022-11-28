from .models import Limitation
from .serializers import (
    UserLimitationWriteSerializer,
    UserLimitationReadSerializer,
    OrgLimitationWriteSerializer,
    OrgLimitationReadSerializer,
)
from .core.limits import LimitManager
from rest_framework.response import Response
from rest_framework import status, viewsets, exceptions
from rest_framework.permissions import SAFE_METHODS
from rest_framework.decorators import action


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

        instance = Limitation.objects.filter(user_id=user_id, org_id=org_id).first()
        if instance is None:
            instance = LimitManager()._create_limitation(user_id=user_id, org_id=org_id)

        data = self.get_serializer_class()(
            context={"request": request}
        ).to_representation(instance)
        return Response(data, status=status.HTTP_200_OK)

    @action(methods=["GET"], detail=False)
    def default(self, request):
        serializer_class = (
            UserLimitationReadSerializer
            if "org" not in request.query_params
            else OrgLimitationReadSerializer
        )
        data = serializer_class().to_representation(instance=Limitation())
        return Response(data, status=status.HTTP_200_OK)
