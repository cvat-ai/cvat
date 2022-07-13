from io import BytesIO, IOBase
from urllib.parse import urlencode
from tempfile import SpooledTemporaryFile

import boto3
from django.conf import settings


DEFAULT_EXPIRES = 7 * 24 * 60 * 60


class S3Client:
    def __init__(self, client=None, bucket_name=settings.AWS_STORAGE_BUCKET_NAME):
        if client is None:
            self._client = boto3.client(
                "s3",
                aws_secret_access_key=settings.AWS_S3_SECRET_ACCESS_KEY,
                aws_access_key_id=settings.AWS_S3_ACCESS_KEY_ID,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                region_name=settings.AWS_S3_REGION_NAME,
            )
        else:
            self._client = client
        self.bucket = bucket_name

    def upload_from_path(self, path: str, key: str) -> bool:
        return self._client.upload_file(str(path), self.bucket, key)

    def upload_from_io(self, io: IOBase, key: str) -> bool:
        io.seek(0)
        with SpooledTemporaryFile() as c:
            c.write(io.read())
            response = self._client.upload_fileobj(c, self.bucket, key)
        return response

    def download_to_path(self, key: str, path: str) -> None:
        self._client.download_file(self.bucket, key, str(path))

    def download_to_io(self, key: str, io=None) -> BytesIO:
        if io is None:
            io = BytesIO()
        self._client.download_fileobj(self.bucket, key, io)
        io.seek(0)
        return io

    def get_presigned_url(self, key: str, expires=DEFAULT_EXPIRES) -> str:
        url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )
        if settings.ENVIRONMENT == 'local' and 'minio' in url:
            url = url.replace('minio', 'localhost', 1)
        return url

    def delete_object(self, key: str) -> bool:
        return self._client.delete_object(self.bucket, key)

    def set_tags(self, key: str, tags: dict) -> dict:
        return self._client.put_object_tagging(Bucket=self.bucket, Key=key, Tagging={
            'TagSet': [{'Key': k, 'Value': v} for k, v in tags.items()]
        })

    def get_tags(self, key: str):
        response = self._client.get_object_tagging(Bucket=self.bucket, Key=key)
        return {item['Key']: item['Value'] for item in response['TagSet']}

    def delete_tags(self, key: str):
        return self._client.delete_object_tagging(Bucket=self.bucket, Key=key)


s3_client = S3Client()
