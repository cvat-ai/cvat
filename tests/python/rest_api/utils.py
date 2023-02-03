# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from http import HTTPStatus
from time import sleep
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple, Union

from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from urllib3 import HTTPResponse

from shared.utils.config import make_api_client


def export_dataset(
    endpoint: Endpoint, *, max_retries: int = 20, interval: float = 0.1, **kwargs
) -> HTTPResponse:
    for _ in range(max_retries):
        (_, response) = endpoint.call_with_http_info(**kwargs, _parse_response=False)
        if response.status == HTTPStatus.CREATED:
            break
        assert response.status == HTTPStatus.ACCEPTED
        sleep(interval)
    assert response.status == HTTPStatus.CREATED

    (_, response) = endpoint.call_with_http_info(**kwargs, action="download", _parse_response=False)
    assert response.status == HTTPStatus.OK

    return response


FieldPath = Sequence[str]


class CollectionSimpleFilterTestBase(metaclass=ABCMeta):
    # These fields need to be defined in the subclass
    user: str
    samples: List[Dict[str, Any]]
    field_lookups: Dict[str, FieldPath] = None

    @abstractmethod
    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        ...

    def _retrieve_collection(self, **kwargs) -> List:
        with make_api_client(self.user) as api_client:
            return get_paginated_collection(self._get_endpoint(api_client), **kwargs)

    @classmethod
    def _get_field(cls, d: Dict[str, Any], path: Union[str, FieldPath]) -> Optional[Any]:
        assert path
        for key in path:
            if isinstance(d, dict):
                d = d.get(key)
            else:
                d = None

        return d

    def _map_field(self, name: str) -> FieldPath:
        return (self.field_lookups or {}).get(name, [name])

    @classmethod
    def _find_valid_field_value(
        cls, samples: Iterator[Dict[str, Any]], field_path: FieldPath
    ) -> Any:
        value = None
        for sample in samples:
            value = cls._get_field(sample, field_path)
            if value:
                break

        assert value, f"Failed to find a sample for the '{'.'.join(field_path)}' field"
        return value

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        field_path = self._map_field(field)
        field_value = self._find_valid_field_value(self.samples, field_path)

        gt_objects = filter(lambda p: field_value == self._get_field(p, field_path), self.samples)

        return field_value, gt_objects

    def test_can_use_simple_filter_for_object_list(self, field):
        value, gt_objects = self._get_field_samples(field)

        received_items = self._retrieve_collection(**{field: str(value)})

        assert set(p["id"] for p in gt_objects) == set(p.id for p in received_items)
