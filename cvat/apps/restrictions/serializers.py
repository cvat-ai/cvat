# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from rest_framework import serializers
from django.conf import settings

from cvat.apps.iam.serializers import RegisterSerializerEx
from cvat.apps.restrictions.signals import user_registered

class UserAgreementSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=256)
    display_text = serializers.CharField(max_length=2048, default='')
    url = serializers.CharField(max_length=2048, default='')
    required = serializers.BooleanField(default=False)
    value = serializers.BooleanField(default=False)

    # pylint: disable=no-self-use
    def to_representation(self, instance):
        instance_ = instance.copy()
        instance_['displayText'] = instance_.pop('display_text')
        return instance_

class RestrictedRegisterSerializer(RegisterSerializerEx):
    confirmations = UserAgreementSerializer(many=True, required=False)

    def validate(self, data):
        validated_data = super().validate(data)
        server_user_agreements = settings.RESTRICTIONS['user_agreements']
        for server_agreement in server_user_agreements:
            if server_agreement['required']:
                is_confirmed = False
                for confirmation in validated_data['confirmations']:
                    if confirmation['name'] == server_agreement['name'] \
                        and confirmation['value']:
                        is_confirmed = True

                if not is_confirmed:
                    raise serializers.ValidationError(
                        'Agreement {} must be accepted'.format(server_agreement['name'])
                    )

        return validated_data

    def save(self, request):
        user = super().save(request)
        confirmations = {item['name']: item['value'] for item in self.validated_data['confirmations']}
        user_registered.send(
            sender=self.__class__,
            user=user.id,
            **confirmations,
        )
        return user
