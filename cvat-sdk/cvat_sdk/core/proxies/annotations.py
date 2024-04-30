# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC
from enum import Enum
from typing import Optional, Sequence

from cvat_sdk import models
from cvat_sdk.core.proxies.model_proxy import _EntityT


class AnnotationUpdateAction(Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class AnnotationCrudMixin(ABC):
    # TODO: refactor

    @property
    def _put_annotations_data_param(self) -> str: ...

    def get_annotations(self: _EntityT) -> models.ILabeledData:
        (annotations, _) = self.api.retrieve_annotations(getattr(self, self._model_id_field))
        return annotations

    def set_annotations(self: _EntityT, data: models.ILabeledDataRequest):
        self.api.update_annotations(
            getattr(self, self._model_id_field), **{self._put_annotations_data_param: data}
        )

    def update_annotations(
        self: _EntityT,
        data: models.IPatchedLabeledDataRequest,
        *,
        action: AnnotationUpdateAction = AnnotationUpdateAction.UPDATE,
    ):
        self.api.partial_update_annotations(
            action=action.value,
            id=getattr(self, self._model_id_field),
            patched_labeled_data_request=data,
        )

    def remove_annotations(self: _EntityT, *, ids: Optional[Sequence[int]] = None):
        if ids:
            anns = self.get_annotations()

            if not isinstance(ids, set):
                ids = set(ids)

            anns_to_remove = models.PatchedLabeledDataRequest(
                tags=[models.LabeledImageRequest(**a.to_dict()) for a in anns.tags if a.id in ids],
                tracks=[
                    models.LabeledTrackRequest(**a.to_dict()) for a in anns.tracks if a.id in ids
                ],
                shapes=[
                    models.LabeledShapeRequest(**a.to_dict()) for a in anns.shapes if a.id in ids
                ],
            )

            self.update_annotations(anns_to_remove, action=AnnotationUpdateAction.DELETE)
        else:
            self.api.destroy_annotations(getattr(self, self._model_id_field))
