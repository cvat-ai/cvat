# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from collections.abc import Mapping, Sequence
from typing import Optional

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


@attrs.frozen
class _SublabelNameMapping:
    name: str


@attrs.frozen
class _LabelNameMapping(_SublabelNameMapping):
    sublabels: Optional[Mapping[str, _SublabelNameMapping]] = attrs.field(
        kw_only=True, default=None
    )

    def map_sublabel(self, name: str):
        if self.sublabels is None:
            return _SublabelNameMapping(name)

        return self.sublabels.get(name)


@attrs.frozen
class _SpecNameMapping:
    labels: Optional[Mapping[str, _LabelNameMapping]] = attrs.field(kw_only=True, default=None)

    def map_label(self, name: str):
        if self.labels is None:
            return _LabelNameMapping(name)

        return self.labels.get(name)


class _AnnotationMapper:
    @attrs.frozen
    class _LabelIdMapping:
        id: int
        sublabels: Mapping[int, Optional[int]]
        expected_num_elements: int = 0

    _label_id_mappings: Mapping[int, Optional[_LabelIdMapping]]

    def _build_label_id_mapping(
        self,
        fun_label: models.ILabel,
        ds_labels_by_name: Mapping[str, models.ILabel],
        *,
        allow_unmatched_labels: bool,
        spec_nm: _SpecNameMapping,
    ) -> Optional[_LabelIdMapping]:
        if getattr(fun_label, "attributes", None):
            raise BadFunctionError(f"label attributes are currently not supported")

        label_nm = spec_nm.map_label(fun_label.name)
        if label_nm is None:
            return None

        ds_label = ds_labels_by_name.get(label_nm.name)
        if ds_label is None:
            if not allow_unmatched_labels:
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

                sublabel_nm = label_nm.map_sublabel(fun_sl.name)
                if sublabel_nm is None:
                    sl_map[fun_sl.id] = None
                    continue

                ds_sl = ds_sublabels_by_name.get(sublabel_nm.name)
                if not ds_sl:
                    if not allow_unmatched_labels:
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

        return self._LabelIdMapping(
            ds_label.id, sublabels=sl_map, expected_num_elements=len(ds_label.sublabels)
        )

    def __init__(
        self,
        logger: logging.Logger,
        fun_labels: Sequence[models.ILabel],
        ds_labels: Sequence[models.ILabel],
        *,
        allow_unmatched_labels: bool,
        conv_mask_to_poly: bool,
        spec_nm: _SpecNameMapping = _SpecNameMapping(),
    ) -> None:
        self._logger = logger
        self._conv_mask_to_poly = conv_mask_to_poly

        ds_labels_by_name = {ds_label.name: ds_label for ds_label in ds_labels}

        self._label_id_mappings = {}

        for fun_label in fun_labels:
            if not hasattr(fun_label, "id"):
                raise BadFunctionError(f"label {fun_label.name!r} has no ID")

            if fun_label.id in self._label_id_mappings:
                raise BadFunctionError(
                    f"label {fun_label.name} has same ID as another label ({fun_label.id})"
                )

            self._label_id_mappings[fun_label.id] = self._build_label_id_mapping(
                fun_label,
                ds_labels_by_name,
                allow_unmatched_labels=allow_unmatched_labels,
                spec_nm=spec_nm,
            )

    def validate_and_remap(self, shapes: list[models.LabeledShapeRequest], ds_frame: int) -> None:
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
                label_id_mapping = self._label_id_mappings[shape.label_id]
            except KeyError:
                raise BadFunctionError(
                    f"function output shape with unknown label ID ({shape.label_id})"
                )

            if not label_id_mapping:
                continue

            shape.label_id = label_id_mapping.id

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
                        mapped_sl_id = label_id_mapping.sublabels[element.label_id]
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

                if len(new_elements) != label_id_mapping.expected_num_elements:
                    # new_elements could only be shorter than expected,
                    # because the reverse would imply that there are more distinct sublabel IDs
                    # than are actually defined in the dataset.
                    assert len(new_elements) < label_id_mapping.expected_num_elements

                    raise BadFunctionError(
                        f"function output skeleton with fewer elements than expected ({len(new_elements)} vs {label_id_mapping.expected_num_elements})"
                    )

                shape.elements[:] = new_elements
            else:
                if getattr(shape, "elements", None):
                    raise BadFunctionError("function output non-skeleton shape with elements")

                if shape.type.value == "mask" and self._conv_mask_to_poly:
                    raise BadFunctionError(
                        "function output mask shape despite conv_mask_to_poly=True"
                    )

        shapes[:] = new_shapes


@attrs.frozen(kw_only=True)
class _DetectionFunctionContextImpl(DetectionFunctionContext):
    frame_name: str
    conf_threshold: Optional[float] = None
    conv_mask_to_poly: bool = False


def annotate_task(
    client: Client,
    task_id: int,
    function: DetectionFunction,
    *,
    pbar: Optional[ProgressReporter] = None,
    clear_existing: bool = False,
    allow_unmatched_labels: bool = False,
    conf_threshold: Optional[float] = None,
    conv_mask_to_poly: bool = False,
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

    The conf_threshold parameter must be None or a number between 0 and 1. It will be passed
    to the AA function as the conf_threshold attribute of the context object.

    The conv_mask_to_poly parameter will be passed to the AA function as the conv_mask_to_poly
    attribute of the context object. If it's true, and the AA function returns any mask shapes,
    BadFunctionError will be raised.
    """

    if pbar is None:
        pbar = NullProgressReporter()

    if conf_threshold is not None and not 0 <= conf_threshold <= 1:
        raise ValueError("conf_threshold must be None or a number between 0 and 1")

    dataset = TaskDataset(client, task_id, load_annotations=False)

    assert isinstance(function.spec, DetectionFunctionSpec)

    mapper = _AnnotationMapper(
        client.logger,
        function.spec.labels,
        dataset.labels,
        allow_unmatched_labels=allow_unmatched_labels,
        conv_mask_to_poly=conv_mask_to_poly,
    )

    shapes = []

    with pbar.task(total=len(dataset.samples), unit="samples"):
        for sample in pbar.iter(dataset.samples):
            frame_shapes = function.detect(
                _DetectionFunctionContextImpl(
                    frame_name=sample.frame_name,
                    conf_threshold=conf_threshold,
                    conv_mask_to_poly=conv_mask_to_poly,
                ),
                sample.media.load_image(),
            )
            mapper.validate_and_remap(frame_shapes, sample.frame_index)
            shapes.extend(frame_shapes)

    client.logger.info("Uploading annotations to task %d...", task_id)

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

    client.logger.info("Upload complete")
