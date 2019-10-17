from django.contrib.auth import get_user_model
from django.core import signing
from furl import furl
import hashlib

QUERY_PARAM = 'sign'
MAX_AGE = 30

# Got implementation ideas in https://github.com/marcgibbons/drf_signed_auth
class Signer:
    @classmethod
    def get_salt(cls, url):
        normalized_url = furl(url).remove(QUERY_PARAM).url.encode('utf-8')
        salt = hashlib.sha256(normalized_url).hexdigest()
        return salt

    def sign(self, user, url):
        """
        Create a signature for a user object.
        """
        data = {
            'user_id': user.pk,
            'username': user.get_username()
        }

        return signing.dumps(data, salt=self.get_salt(url))

    def unsign(self, signature, url):
        """
        Return a user object for a valid signature.
        """
        User = get_user_model()
        data = signing.loads(signature, salt=self.get_salt(url), max_age=MAX_AGE)

        if not isinstance(data, dict):
            raise signing.BadSignature()

        try:
            return User.objects.get(**{
                'pk': data.get('user_id'),
                User.USERNAME_FIELD: data.get('username')
            })
        except User.DoesNotExist:
            raise signing.BadSignature()
