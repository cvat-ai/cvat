# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Sequence
from typing import Any, cast

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
import PIL.Image
from cvat_sdk import models
from cvat_sdk.auto_annotation.driver import (
    _AnnotationMapper,
    _DetectionFunctionContextImpl,
    _SpecNameMapping,
)

from .agent_driver import (
    AgentFunctionDriver,
    CheckInCallback,
    IncompatibleFunctionError,
    worker_current_function,
)


def _worker_job_detect(
    context: _DetectionFunctionContextImpl, image: PIL.Image.Image
) -> Sequence[cvataa.DetectionAnnotation]:
    current_function = cast(cvataa.DetectionFunction, worker_current_function())
    return current_function.detect(context, image)


class AgentDetectionFunctionDriver(AgentFunctionDriver):
    FUNCTION_KIND = "detector"
    _function_spec: cvataa.DetectionFunctionSpec

    def _validate_sublabel_compatibility(
        self, remote_sl: dict, sl: models.Sublabel | None, sl_desc: str
    ):
        if not sl:
            raise IncompatibleFunctionError(f"{sl_desc} is not supported.")

        if remote_sl["type"] not in {"any", "unknown"} and remote_sl["type"] != sl.type:
            raise IncompatibleFunctionError(
                f"{sl_desc} has type {remote_sl['type']!r}, "
                f"but the function object declares type {sl.type!r}."
            )

        attrs_by_name = {attr.name: attr for attr in getattr(sl, "attributes", [])}

        for remote_attr in remote_sl["attributes"]:
            attr_desc = f"attribute {remote_attr['name']!r} of {sl_desc}"
            attr = attrs_by_name.get(remote_attr["name"])

            if not attr:
                raise IncompatibleFunctionError(f"{attr_desc} is not supported.")

            if remote_attr["input_type"] != attr.input_type.value:
                raise IncompatibleFunctionError(
                    f"{attr_desc} has input type {remote_attr['input_type']!r},"
                    f" but the function object declares input type {attr.input_type.value!r}."
                )

            if remote_attr["values"] != attr.values:
                raise IncompatibleFunctionError(
                    f"{attr_desc} has values {remote_attr['values']!r},"
                    f" but the function object declares values {attr.values!r}."
                )

    def validate_function_compatibility(self, remote_function: dict) -> None:
        labels_by_name = {label.name: label for label in self._function_spec.labels}

        for remote_label in remote_function["labels_v2"]:
            label_desc = f"label {remote_label['name']!r}"
            label = labels_by_name.get(remote_label["name"])

            self._validate_sublabel_compatibility(remote_label, label, label_desc)

            sublabels_by_name = {sl.name: sl for sl in getattr(label, "sublabels", [])}

            for remote_sl in remote_label.get("sublabels", []):
                sl_desc = f"sublabel {remote_sl['name']!r} of {label_desc}"
                sl = sublabels_by_name.get(remote_sl["name"])

                self._validate_sublabel_compatibility(remote_sl, sl, sl_desc)

    def _create_annotation_mapper_for_detection_ar(
        self, ar_params: dict, ds_labels: Sequence[models.ILabel]
    ) -> _AnnotationMapper:
        spec_nm = _SpecNameMapping.from_api(
            {
                k: models.LabelMappingEntryRequest._from_openapi_data(**v)
                for k, v in ar_params["mapping"].items()
            }
        )

        return _AnnotationMapper(
            self._client.logger,
            self._function_spec.labels,
            ds_labels,
            allow_unmatched_labels=False,
            spec_nm=spec_nm,
            conv_mask_to_poly=ar_params["conv_mask_to_poly"],
        )

    def _create_detection_function_context(
        self, ar_params: dict, frame_name: str
    ) -> cvataa.DetectionFunctionContext:
        return _DetectionFunctionContextImpl(
            frame_name=frame_name,
            conf_threshold=ar_params["threshold"],
            conv_mask_to_poly=ar_params["conv_mask_to_poly"],
        )

    def _calculate_result_for_annotate_task_ar(
        self, ar_params: dict[str, Any], check_in: CheckInCallback
    ) -> dict[str, Any]:
        ds = cvatds.TaskDataset(
            self._client,
            ar_params["task"],
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        )

        # Fetching the dataset might take a while, so check in to let the server
        # know we're still alive.
        check_in(current_progress=0)

        mapper = self._create_annotation_mapper_for_detection_ar(ar_params, ds.labels)

        all_annotations = models.PatchedLabeledDataRequest(tags=[], shapes=[])

        with ds.iter_samples(temporary_chunks=True) as samples:
            for sample_index, sample in enumerate(samples):
                context = self._create_detection_function_context(ar_params, sample.frame_name)
                annotations = self._executor.result(
                    self._executor.submit(
                        _worker_job_detect, context, self._load_image_for_ar(sample, ar_params)
                    )
                )

                tags, shapes = mapper.validate_and_remap(annotations, sample.frame_index)
                all_annotations.tags.extend(tags)
                all_annotations.shapes.extend(shapes)

                check_in(current_progress=(sample_index + 1) / len(ds.samples))

        return {"annotations": all_annotations}

    def _calculate_result_for_annotate_frame_ar(
        self, ar_params: dict[str, Any], check_in: object
    ) -> dict[str, Any]:
        sample, ds_labels = self._get_sample_from_ar_params(ar_params)

        mapper = self._create_annotation_mapper_for_detection_ar(ar_params, ds_labels)

        context = self._create_detection_function_context(ar_params, sample.frame_name)

        annotations = self._executor.result(
            self._executor.submit(
                _worker_job_detect, context, self._load_image_for_ar(sample, ar_params)
            )
        )

        tags, shapes = mapper.validate_and_remap(annotations, sample.frame_index)
        return {"annotations": models.PatchedLabeledDataRequest(tags=tags, shapes=shapes)}

    _CALCULATE_RESULT_PER_AR_TYPE = {
        "annotate_task": _calculate_result_for_annotate_task_ar,
        "annotate_frame": _calculate_result_for_annotate_frame_ar,
    }
