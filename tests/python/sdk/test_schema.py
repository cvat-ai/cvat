import pytest
from cvat_sdk import Client
from cvat_sdk.core.client import make_client
from cvat_sdk.core import schema as sc
from cvat_sdk.core.exceptions import InvalidHostException
from shared.utils.config import BASE_URL


class TestSchemaDetection:
    """
    Testing whether the client can detect the URL schema
    """

    @pytest.mark.parametrize("get_schema", ['http://', 'https://', '', None, 'ftp://'])
    def test_schema_detection(self, get_schema):

        host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)

        if get_schema is not None:
            try:
                client = make_client(host=get_schema + host, port=int(port))
            except InvalidHostException:
                client = Client(BASE_URL)  # changing to another instance creation method to get urls
        else:
            raise InvalidHostException()

        assert sc.detect_schema(client.api_map.host) == get_schema + host + ":" + port
