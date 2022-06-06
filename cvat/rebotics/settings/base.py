# AWS S3 settings for media storage.
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_ADDRESSING_STYLE = 'virtual'
AWS_DEFAULT_ACL = 'private'
AWS_LOCATION = 'cvat-media'
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 604800
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=3600',
}

# DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
DEFAULT_FILE_STORAGE = 'cvat.rebotics.storage.CustomAWSMediaStorage'
