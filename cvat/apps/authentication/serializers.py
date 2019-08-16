from rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers


class RegisterSerializerEx(RegisterSerializer):
  first_name = serializers.CharField(required=False)
  last_name = serializers.CharField(required=False)

  def get_cleaned_data(self):
    data = super().get_cleaned_data()
    data.update({
        'first_name': self.validated_data.get('first_name', ''),
        'last_name': self.validated_data.get('last_name', ''),
    })

    return data
