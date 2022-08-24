# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import io
from typing import List, Optional, Set

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.proxies.annotations import AnnotationCrudMixin
from cvat_sdk.core.proxies.model_proxy import (
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)


_CloudStorageEntityBase, _CloudStorageRepoBase = build_model_bases(
    models.CloudStorageRead, apis.CloudstoragesApi, api_member_name="cloudstorages_api"
)


class CloudStorage(
    _CloudStorageEntityBase,
    models.ICloudStorageRead,
    ModelUpdateMixin[models.IPatchedCloudStorageWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_cloudstorage_write_request"
    _put_annotations_data_param = "cloudstorage_annotations_update_request"

    def get_actions(self) -> Set[str]:
        return set(self.api.retrieve_actions(self.id)[0])

    def get_preview(self) -> io.RawIOBase:
        (_, response) = self.api.retrieve_preview(self.id)
        return io.BytesIO(response.data)

    def get_status(self) -> str:
        return self.api.retrieve_status(self.id)[0]

    def get_content(self, manifest_path: Optional[str] = None) -> List[str]:
        kwargs = {}
        if manifest_path:
            kwargs['manifest_path'] = manifest_path
        return self.api.retrieve_content(self.id, **kwargs)[0]

class CloudStoragesRepo(
    _CloudStorageRepoBase,
    ModelCreateMixin[CloudStorage, models.ICloudStorageWriteRequest],
    ModelRetrieveMixin[CloudStorage],
    ModelListMixin[CloudStorage],
):
    _entity_type = CloudStorage
