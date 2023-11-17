# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from typing import List, Mapping, Optional, Sequence

import attrs

import cvat_sdk.models as models
from cvat_sdk.core import Client
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter
from cvat_sdk.datasets.task_dataset import TaskDataset

from .interface import DetectionFunction, DetectionFunctionContext, DetectionFunctionSpec


class BadFunctionError(Exception):
    """
    An exception that signifies that an auto-detection function has violated some constraint
    set by its interface.
    """


class _AnnotationMapper:
    @attrs.frozen
    class _MappedLabel:
        id: int
        sublabel_mapping: Mapping[int, Optional[int]]
        expected_num_elements: int = 0

    _label_mapping: Mapping[int, Optional[_MappedLabel]]

    def _build_mapped_label(
        self, fun_label: models.ILabel, ds_labels_by_name: Mapping[str, models.ILabel]
    ) -> Optional[_MappedLabel]:
        if getattr(fun_label, "attributes", None):
            raise BadFunctionError(f"label attributes are currently not supported")

        ds_label = ds_labels_by_name.get(fun_label.name)
        if ds_label is None:
            if not self._allow_unmatched_labels:
                raise BadFunctionError(f"label {fun_label.name!r} is not in dataset")

            self._logger.info(
                "label %r is not in dataset; any annotations using it will be ignored",
                fun_label.name,
            )
            return None

        sl_map = {}

        if getattr(fun_label, "sublabels", []):
            fun_label_type = getattr(fun_label, "type", "any")
            if fun_label_type != "skeleton":
                raise BadFunctionError(
                    f"label {fun_label.name!r} with sublabels has type {fun_label_type!r} (should be 'skeleton')"
                )

            ds_sublabels_by_name = {ds_sl.name: ds_sl for ds_sl in ds_label.sublabels}

            for fun_sl in fun_label.sublabels:
                if not hasattr(fun_sl, "id"):
                    raise BadFunctionError(
                        f"sublabel {fun_sl.name!r} of label {fun_label.name!r} has no ID"
                    )

                if fun_sl.id in sl_map:
                    raise BadFunctionError(
                        f"sublabel {fun_sl.name!r} of label {fun_label.name!r} has same ID as another sublabel ({fun_sl.id})"
                    )

                ds_sl = ds_sublabels_by_name.get(fun_sl.name)
                if not ds_sl:
                    if not self._allow_unmatched_labels:
                        raise BadFunctionError(
                            f"sublabel {fun_sl.name!r} of label {fun_label.name!r} is not in dataset"
                        )

                    self._logger.info(
                        "sublabel %r of label %r is not in dataset; any annotations using it will be ignored",
                        fun_sl.name,
                        fun_label.name,
                    )
                    sl_map[fun_sl.id] = None
                    continue

                sl_map[fun_sl.id] = ds_sl.id

        return self._MappedLabel(
            ds_label.id, sublabel_mapping=sl_map, expected_num_elements=len(ds_label.sublabels)
        )

    def __init__(
        self,
        logger: logging.Logger,
        fun_labels: Sequence[models.ILabel],
        ds_labels: Sequence[models.ILabel],
        *,
        allow_unmatched_labels: bool,
    ) -> None:
        self._logger = logger
        self._allow_unmatched_labels = allow_unmatched_labels

        ds_labels_by_name = {ds_label.name: ds_label for ds_label in ds_labels}

        self._label_mapping = {}

        for fun_label in fun_labels:
            if not hasattr(fun_label, "id"):
                raise BadFunctionError(f"label {fun_label.name!r} has no ID")

            if fun_label.id in self._label_mapping:
                raise BadFunctionError(
                    f"label {fun_label.name} has same ID as another label ({fun_label.id})"
                )

            self._label_mapping[fun_label.id] = self._build_mapped_label(
                fun_label, ds_labels_by_name
            )

    def validate_and_remap(self, shapes: List[models.LabeledShapeRequest], ds_frame: int) -> None:
        new_shapes = []

        for shape in shapes:
            if hasattr(shape, "id"):
                raise BadFunctionError("function output shape with preset id")

            if hasattr(shape, "source"):
                raise BadFunctionError("function output shape with preset source")
            shape.source = "auto"

            if shape.frame != 0:
                raise BadFunctionError(
                    f"function output shape with unexpected frame number ({shape.frame})"
                )

            shape.frame = ds_frame

            try:
                mapped_label = self._label_mapping[shape.label_id]
            except KeyError:
                raise BadFunctionError(
                    f"function output shape with unknown label ID ({shape.label_id})"
                )

            if not mapped_label:
                continue

            shape.label_id = mapped_label.id

            if getattr(shape, "attributes", None):
                raise BadFunctionError(
                    "function output shape with attributes, which is not yet supported"
                )

            new_shapes.append(shape)

            if shape.type.value == "skeleton":
                new_elements = []
                seen_sl_ids = set()

                for element in shape.elements:
                    if hasattr(element, "id"):
                        raise BadFunctionError("function output shape element with preset id")

                    if hasattr(element, "source"):
                        raise BadFunctionError("function output shape element with preset source")
                    element.source = "auto"

                    if element.frame != 0:
                        raise BadFunctionError(
                            f"function output shape element with unexpected frame number ({element.frame})"
                        )

                    element.frame = ds_frame

                    if element.type.value != "points":
                        raise BadFunctionError(
                            f"function output skeleton with element type other than 'points' ({element.type.value})"
                        )

                    try:
                        mapped_sl_id = mapped_label.sublabel_mapping[element.label_id]
                    except KeyError:
                        raise BadFunctionError(
                            f"function output shape with unknown sublabel ID ({element.label_id})"
                        )

                    if not mapped_sl_id:
                        continue

                    if mapped_sl_id in seen_sl_ids:
                        raise BadFunctionError(
                            "function output skeleton with multiple elements with same sublabel"
                        )

                    element.label_id = mapped_sl_id

                    seen_sl_ids.add(mapped_sl_id)

                    new_elements.append(element)

                if len(new_elements) != mapped_label.expected_num_elements:
                    # new_elements could only be shorter than expected,
                    # because the reverse would imply that there are more distinct sublabel IDs
                    # than are actually defined in the dataset.
                    assert len(new_elements) < mapped_label.expected_num_elements

                    raise BadFunctionError(
                        f"function output skeleton with fewer elements than expected ({len(new_elements)} vs {mapped_label.expected_num_elements})"
                    )

                shape.elements[:] = new_elements
            else:
                if getattr(shape, "elements", None):
                    raise BadFunctionError("function output non-skeleton shape with elements")

        shapes[:] = new_shapes


@attrs.frozen
class _DetectionFunctionContextImpl(DetectionFunctionContext):
    frame_name: str


def annotate_task(
    client: Client,
    task_id: int,
    function: DetectionFunction,
    *,
    pbar: Optional[ProgressReporter] = None,
    clear_existing: bool = False,
    allow_unmatched_labels: bool = False,
) -> None:
    """
    Downloads data for the task with the given ID, applies the given function to it
    and uploads the resulting annotations back to the task.

    Only tasks with 2D image (not video) data are supported at the moment.

    client is used to make all requests to the CVAT server.

    Currently, the only type of auto-annotation function supported is the detection function.
    A function of this type is applied independently to each image in the task.
    The resulting annotations are then combined and modified as follows:

    * The label IDs are replaced with the IDs of the corresponding labels in the task.
    * The frame numbers are replaced with the frame number of the image.
    * The sources are set to "auto".

    See the documentation for DetectionFunction for more details.

    If the function is found to violate any constraints set in its interface, BadFunctionError
    is raised.

    pbar, if supplied, is used to report progress information.

    If clear_existing is true, any annotations already existing in the tesk are removed.
    Otherwise, they are kept, and the new annotations are added to them.

    The allow_unmatched_labels parameter controls the behavior in the case when a detection
    function declares a label in its spec that has no corresponding label in the task.
    If it's set to true, then such labels are allowed, and any annotations returned by the
    function that refer to this label are ignored. Otherwise, BadFunctionError is raised.
    """

    if pbar is None:
        pbar = NullProgressReporter()

    dataset = TaskDataset(client, task_id, load_annotations=False)

    assert isinstance(function.spec, DetectionFunctionSpec)

    mapper = _AnnotationMapper(
        client.logger,
        function.spec.labels,
        dataset.labels,
        allow_unmatched_labels=allow_unmatched_labels,
    )

    shapes = []

    with pbar.task(total=len(dataset.samples), unit="samples"):
        for sample in pbar.iter(dataset.samples):
            frame_shapes = function.detect(
                _DetectionFunctionContextImpl(sample.frame_name), sample.media.load_image()
            )
            mapper.validate_and_remap(frame_shapes, sample.frame_index)
            shapes.extend(frame_shapes)

    client.logger.info("Uploading annotations to task %d", task_id)

    if clear_existing:
        client.tasks.api.update_annotations(
            task_id, task_annotations_update_request=models.LabeledDataRequest(shapes=shapes)
        )
    else:
        client.tasks.api.partial_update_annotations(
            "create",
            task_id,
            patched_labeled_data_request=models.PatchedLabeledDataRequest(shapes=shapes),
        )
