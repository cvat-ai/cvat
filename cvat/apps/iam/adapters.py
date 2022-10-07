import requests
from django.contrib.auth import get_user_model
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.providers.amazon_cognito.views import AmazonCognitoOAuth2Adapter


class AmazonCognitoOAuth2AdapterEx(AmazonCognitoOAuth2Adapter):
    def complete_login(self, request, app, access_token, **kwargs):
        headers = {
            "Authorization": "Bearer {}".format(access_token),
        }
        if 'https' in self.profile_url:
            extra_data = requests.get(self.profile_url, headers=headers)
        else:
            user_url = self.profile_url.lower()
            extra_data = requests.get(user_url, headers=headers)
        extra_data.raise_for_status()

        login = self.get_provider().sociallogin_from_response(request, extra_data.json())
        return login

class SocialAccountAdapterEx(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):

        if sociallogin.is_existing:
            return

        if sociallogin.email_addresses==[]:
            raise Exception("No valid email address to login")

        try:
            django_user = get_user_model()
            user = django_user.objects.get(email=sociallogin.user.email)
            sociallogin.connect(request, user)
        except django_user.DoesNotExist:
            return
