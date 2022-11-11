import logging

import requests
from django.conf import settings
from django.contrib.auth.models import User
from random import randint
from rest_framework import authentication, exceptions


logger = logging.getLogger(__name__)


class RetailerInAdminAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        retailer_codename = request.META.get('HTTP_X_RETAILER_CODENAME')
        secret_key = request.META.get('HTTP_X_RETAILER_SECRET_KEY')

        if not retailer_codename or not secret_key:
            # skip the authentication method if the headers are absent
            return None

        try:
            auth_url = settings.ADMIN_URL.rstrip('/') + '/' + 'retailers/auth/'

            res = requests.post(auth_url, headers={
                'x-retailer-secret-key': secret_key,
                'x-retailer-codename': retailer_codename
            })
        except requests.exceptions.RequestException:
            raise exceptions.AuthenticationFailed('Admin server is not available. Try again later')

        try:
            res.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.exception(e, exc_info=True)
            raise exceptions.AuthenticationFailed('Authentication failed for retailer: %s' % e)

        try:
            data = res.json()

            try:
                user = User.objects.get(username=data['code'])
            except User.DoesNotExist:
                user = User(username=f'{data["code"]}_import',
                            first_name=f'{data["title"]}',
                            last_name='Import')
                random_pass = ''.join([chr(randint(33, 126)) for _ in range(12)])
                user.set_password(random_pass)
                user.save()

            return user, None
        except (KeyError, AssertionError) as e:
            raise exceptions.AuthenticationFailed('Admin did not validate your retailer. {}'.format(e))
