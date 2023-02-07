import logging
import random
import string

from django.contrib.auth import login
from django.conf import settings
from django.contrib.auth.models import Group, User
from rest_framework import authentication
log = logging.getLogger(__name__)


def generate_random_password(length=16):
    """
    Generate a random password of given length between 8 and 32.
    If the input length is invalid, the default length 16 will be used.

    Args:
        length: The length of the password. Integer. Valid value: 8 - 32, inclusive.
    """
    if length > 32 or length < 8:
        log.warn(f'Invalid password length: {length}. Use 16 instead.')
        length = 16
    lower = string.ascii_lowercase
    upper = string.ascii_uppercase
    num = string.digits

    all_chars = lower + upper + num
    chars = random.sample(all_chars, length)
    return "".join(chars)

def set_user_groups(groups_str, user):
    """
    Parse the groups_str into groups, and add the user to the
    corresponding groups if applicable.

    Args:
        groups_str: The user groups represented as colon-separated string.
        user: The django user object.
    """
    user_groups = []
    if groups_str:
        groups = groups_str.split(':')

        for role in groups:
            role = role.strip()
            if role in settings.IAM_ROLES:
                db_group = Group.objects.get(name=role)
                user_groups.append(db_group)
            if role == str(settings.IAM_ADMIN_ROLE):
                user.is_staff = user.is_superuser = True

    if user_groups:
        user.groups.set(user_groups)
    user.save()

class HeaderAuthentication(authentication.BaseAuthentication):
    """
    A class to handle header-based authentication.
    If the user (by email) does not exist in local database, an entry will
    be created for this user, using email as the unique identifier,
    together with other information retrieved from the external
    Identity Provider.
    When there is user information update, the local database will be
    updated accordingly.
    NOTE: The restriction of the original system that the user name
    must be unique still holds true. And additionally the email must
    also be unique.
    """
    def authenticate(self, request):
        # The user email is treated as the unique identify here.
        # If there is no email in the headers, then the authentication is
        # considered as a failure.
        # A header of "x-email" is expected for the email string.
        email = request.META.get('HTTP_X_EMAIL')
        if not email:
            log.error('Unable to retrieve user email from header x-email.')
            return None

        # Retrieve the username from header "x-email".
        # Here we reuse the email header for the username field since it's unique.
        # You can modify it to other header fields if you want to.
        # For example, you can change it to HTTP_X_USERNAME if you have x-username
        # header coming from the request.
        username = request.META.get('HTTP_X_EMAIL')
        if not username:
            log.warn('Unable to retrieve username from header.')

        # A header of "x-groups" is expected for the user groups.
        groups = request.META.get('HTTP_X_GROUPS')
        if not groups:
            log.warn('Unable to retrieve user groups from header x-groups.')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            password = generate_random_password(length=24)
            if not username:
                user = User.objects.create_user(username=email, email=email, password=password)
            else:
                user = User.objects.create_user(username=username, email=email, password=password)
            set_user_groups(groups_str=groups, user=user)

        session = getattr(request, 'session')
        if user is not None and session.session_key is None:
            login(request, user, 'django.contrib.auth.backends.ModelBackend')

        return (user, None)
