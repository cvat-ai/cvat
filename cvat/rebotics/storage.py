import logging
import os
from tempfile import SpooledTemporaryFile

import requests
from botocore.exceptions import ClientError
from six import StringIO
from storages.backends.s3boto3 import S3Boto3Storage, S3Boto3StorageFile
from django.conf import settings

logger = logging.getLogger(__name__)


class FailedToUploadFileToS3(Exception):
    pass


class BaseS3StorageWithPathMixin(object):
    def path(self, name):
        return os.path.join(self.location, name)

    # This is done to be able to still save the processsing action even if image does not exist.
    # Same for product page
    def _open(self, name, mode='rb'):
        name = self._normalize_name(self._clean_name(name))
        try:
            f = S3Boto3StorageFile(name, mode, self)
        except ClientError as err:
            if err.response['ResponseMetadata']['HTTPStatusCode'] == 404:
                # These 2 lines will not raise exception if file does not exist.
                # in other cases it still will raise exception
                logger.exception("'File does not exist: %s'", name)
                return StringIO()
            raise  # Let it bubble up if it was some other error
        return f

    def _save_content(self, obj, content, parameters):
        """
        We create a clone of the content file as when this is passed to boto3 it wrongly closes
        the file upon upload where as the storage backend expects it to still be open
        """
        # Seek our content back to the start
        content.seek(0, os.SEEK_SET)

        # Create a temporary file that will write to disk after a specified size
        content_autoclose = SpooledTemporaryFile()

        # Write our original content into our copy that will be closed by boto3
        content_autoclose.write(content.read())

        # Upload the object which will auto close the content_autoclose instance
        super(BaseS3StorageWithPathMixin, self)._save_content(obj, content_autoclose, parameters)

        # Cleanup if this is fixed upstream our duplicate should always close
        if not content_autoclose.closed:
            content_autoclose.close()


class CustomAWSMediaStorage(BaseS3StorageWithPathMixin, S3Boto3Storage):
    def url(self, name, parameters=None, expire=None, **kwargs):
        # Preserve the trailing slash after normalizing the path.
        # TODO: Handle force_http=not self.secure_urls like in s3boto
        name = self._normalize_name(self._clean_name(name))
        url = self.get_presigned_url(name, parameters, expire)
        if settings.ENVIRONMENT == 'local' and 'minio' in url:
            url = url.replace('minio', 'localhost', 1)
        return url

    def get_presigned_url(self, name, parameters=None, expire=None):
        if expire is None:
            expire = self.querystring_expire

        params = parameters.copy() if parameters else {}
        params['Bucket'] = self.bucket.name
        params['Key'] = self._clean_name(name)
        url = self.bucket.meta.client.generate_presigned_url('get_object', Params=params,
                                                             ExpiresIn=expire)
        if self.querystring_auth:
            return url

        return self._strip_signing_parameters(url)


def create_pre_signed_post(file_field):
    """Creates a presigned post data for the upload for the file field
        file_field django.db.models.FileField:
    """
    if not hasattr(file_field.storage, 'bucket'):
        # you cant create a presigned_post for non S3 compatible storage API
        return None

    return file_field.storage.bucket.meta.client.generate_presigned_post(
        file_field.storage.bucket.name,
        file_field.path
    )


def send_file_to_pre_signed_destination(file_io, destination, filename=None):
    """
    :param file_io: file with .read()
    :param destination dict: response from client('s3').generate_presigned_post()
    :param filename str:  very optional one
    """

    if filename is None:
        filename = os.path.split(destination['fields']['key'])[:-1]

    file_io.seek(0)
    files = {
        'file': (filename, file_io)
    }
    response = requests.post(destination['url'], data=destination['fields'], files=files)

    if response.status_code != 204:
        raise FailedToUploadFileToS3('S3 error: {}'.format(response.content))
