# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.permissions import AllowAny


from cvat.apps.restrictions.serializers import UserAgreementSerializer

class RestrictionsViewSet(viewsets.ViewSet):
    serializer_class = None
    permission_classes_by_action = {
        'user_agreements': [AllowAny],
    }

    # To get nice documentation about ServerViewSet actions it is necessary
    # to implement the method. By default, ViewSet doesn't provide it.
    def get_serializer(self, *args, **kwargs):
        pass

    def get_permissions(self):
        try:
            return [permission() for permission in self.permission_classes_by_action[self.action]]
        except KeyError:
            return [permission() for permission in self.permission_classes]

    @staticmethod
    @swagger_auto_schema(
        method='get',
        operation_summary='Method provides user agreements that the user must accept to register',
        responses={'200': UserAgreementSerializer})
    @action(detail=False, methods=['GET'], serializer_class=UserAgreementSerializer)
    def user_agreements(request):
        user_agreements = settings.RESTRICTIONS['user_agreements']
        serializer = UserAgreementSerializer(data=user_agreements, many=True)
        serializer.is_valid(raise_exception=True)
        return Response(data=serializer.data)
