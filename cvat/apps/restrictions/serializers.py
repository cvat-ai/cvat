# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT


from rest_framework import serializers
from django.conf import settings

from cvat.apps.authentication.serializers import RegisterSerializerEx

class UserAgreementSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=256)
    display_text = serializers.CharField(max_length=2048, default='')
    url = serializers.URLField(default='')
    required = serializers.BooleanField(default=False)
    value = serializers.BooleanField(default=False)

class RestrictedRegisterSerializer(RegisterSerializerEx):
    user_agreements = UserAgreementSerializer(many=True, required=False)

    def validate(self, data):
        validated_data = super().validate(data)
        server_user_agreements = settings.RESTRICTIONS['user_agreements']
        for server_agreement in server_user_agreements:
            if server_agreement['required']:
                for user_agreement in validated_data['user_agreements']:
                    if user_agreement['name'] == server_agreement['name'] \
                        and not user_agreement['value']:
                        raise serializers.ValidationError(
                            'Agreement {} must be accepted'.format(server_agreement['display_text'])
                        )

        return validated_data


