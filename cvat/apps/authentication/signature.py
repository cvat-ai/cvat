from django.contrib.auth import get_user_model
from django.core import signing
from furl import furl

QUERY_PARAM = 'sign'
MAX_AGE = 30

# Got implementation ideas in https://github.com/marcgibbons/drf_signed_auth
class Signer:
    def sign(self, user, url):
        """
        Create a signature for a user object.
        """
        signer = signing.TimestampSigner()
        data = {
            'user_id': user.pk,
            'username': user.get_username(),
            'url': url
        }

        return signer.sign(signing.dumps(data))

    def unsign(self, signature, url):
        """
        Return a user object for a valid signature.
        """
        User = get_user_model()
        signer = signing.TimestampSigner()
        data = signing.loads(signer.unsign(signature, MAX_AGE))

        if not isinstance(data, dict):
            raise signing.BadSignature()

        if not furl(url).remove(QUERY_PARAM) != url:
            raise signing.BadSignature()

        try:
            return User.objects.get(**{
                'pk': data.get('user_id'),
                User.USERNAME_FIELD: data.get('username')
            })
        except User.DoesNotExist:
            raise signing.BadSignature()
