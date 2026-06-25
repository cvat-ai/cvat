# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Video auto-annotation using the TwelveLabs Pegasus video-understanding model.

Unlike the torchvision detection functions in this package, Pegasus is a
*video* model: it reasons about a whole clip rather than individual frames.
It is therefore not exposed as a per-frame ``DetectionFunction`` (which the
``annotate_task`` driver applies image by image), but as a task-level helper.

The helper sends the task's source video to Pegasus, asks it to enumerate the
distinct events in the video together with their timestamps, and turns each
event into a CVAT *tag* placed on the frame that corresponds to the event's
start time. The event label is matched to a task label by name, following the
same name-based matching used elsewhere in this package.

This is an opt-in integration; nothing here runs unless you call it explicitly.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

import cvat_sdk.models as models

if TYPE_CHECKING:
    from cvat_sdk.core import Client

# The schema Pegasus is asked to fill in. Kept here so it is easy to audit and
# so the prompt and the parsing stay in sync.
_EVENT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "start_time": {
                        "type": "number",
                        "description": "Start time of the event, in seconds.",
                    },
                    "label": {
                        "type": "string",
                        "description": "Short label naming the event (a few words).",
                    },
                    "description": {
                        "type": "string",
                        "description": "One-sentence description of the event.",
                    },
                },
                "required": ["start_time", "label"],
            },
        }
    },
    "required": ["events"],
}

_DEFAULT_PROMPT = (
    "Watch the video and identify the distinct events that occur in it. "
    "For each event, report the start time in seconds, a short label naming "
    "the event, and a one-sentence description."
)


class TwelveLabsPegasusFunction:
    """
    Task-level auto-annotation backed by TwelveLabs Pegasus.

    The source video must be reachable by the TwelveLabs API. Provide it as a
    public HTTP(S) URL (``video_url``) or as the id of an asset you have already
    uploaded to TwelveLabs (``asset_id``).
    """

    def __init__(
        self,
        *,
        video_url: str | None = None,
        asset_id: str | None = None,
        api_key: str | None = None,
        model_name: str = "pegasus1.5",
        prompt: str = _DEFAULT_PROMPT,
        max_tokens: int = 2048,
        default_label: str = "event",
    ) -> None:
        if (video_url is None) == (asset_id is None):
            raise ValueError("exactly one of video_url and asset_id must be provided")

        api_key = api_key or os.getenv("TWELVELABS_API_KEY")
        if not api_key:
            raise ValueError(
                "a TwelveLabs API key must be supplied via the api_key argument"
                " or the TWELVELABS_API_KEY environment variable"
            )

        # Imported lazily so that the rest of the SDK does not depend on the
        # twelvelabs package being installed.
        from twelvelabs import TwelveLabs
        from twelvelabs.types.video_context import (
            VideoContext_AssetId,
            VideoContext_Url,
        )

        self._client = TwelveLabs(api_key=api_key)
        self._model_name = model_name
        self._prompt = prompt
        self._max_tokens = max_tokens
        self._default_label = default_label

        if video_url is not None:
            self._video = VideoContext_Url(url=video_url)
        else:
            self._video = VideoContext_AssetId(asset_id=asset_id)

    def _analyze(self) -> Sequence[dict[str, Any]]:
        from twelvelabs.types.sync_response_format import SyncResponseFormat

        response = self._client.analyze(
            model_name=self._model_name,
            video=self._video,
            prompt=self._prompt,
            response_format=SyncResponseFormat(type="json_schema", json_schema=_EVENT_SCHEMA),
            max_tokens=self._max_tokens,
        )

        import json

        data = json.loads(response.data)
        events = data.get("events", [])
        if not isinstance(events, list):
            raise ValueError("Pegasus returned an unexpected response (no event list)")
        return events

    def annotate_task(
        self,
        client: Client,
        task_id: int,
        *,
        fps: float | None = None,
        clear_existing: bool = False,
    ) -> None:
        """
        Annotate the CVAT task with the given id using Pegasus.

        Each event reported by Pegasus becomes a tag on the frame matching its
        start time. The event's label is matched to a task label by name; events
        whose label has no matching task label fall back to ``default_label``,
        and are skipped if that label is not present in the task either.

        ``fps`` is the frame rate of the task's video and is used to convert
        event timestamps (in seconds) to frame indices. If it is omitted, all
        tags are placed on the first frame (frame 0), since the CVAT API does
        not expose the video frame rate.

        If ``clear_existing`` is true, existing annotations are replaced;
        otherwise the new tags are appended.
        """
        task = client.tasks.retrieve(task_id)
        label_ids = {label.name: label.id for label in task.get_labels()}
        size = task.get_meta().size

        tags: list[models.LabeledImageRequest] = []

        for event in self._analyze():
            name = event.get("label") or self._default_label
            label_id = label_ids.get(name)
            if label_id is None:
                label_id = label_ids.get(self._default_label)
            if label_id is None:
                client.logger.info(
                    "Skipping event %r: no matching task label and no %r label",
                    name,
                    self._default_label,
                )
                continue

            if fps is not None:
                frame = round(float(event.get("start_time", 0)) * fps)
                frame = max(0, min(frame, size - 1))
            else:
                frame = 0

            tags.append(models.LabeledImageRequest(label_id=label_id, frame=frame, source="auto"))

        client.logger.info("Uploading %d tag(s) to task %d...", len(tags), task_id)

        if clear_existing:
            client.tasks.api.update_annotations(
                task_id,
                labeled_data_request=models.LabeledDataRequest(tags=tags),
            )
        else:
            client.tasks.api.partial_update_annotations(
                "create",
                task_id,
                patched_labeled_data_request=models.PatchedLabeledDataRequest(tags=tags),
            )

        client.logger.info("Upload complete")


create = TwelveLabsPegasusFunction
