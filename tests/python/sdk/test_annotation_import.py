# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import pytest
from cvat_sdk.api_client import models
from cvat_sdk.core.proxies.tasks import Task


@pytest.mark.parametrize(
    ("import_mode", "expected_shape_count"),
    [
        ("replace", 1),
        ("append", 2),
    ],
)
def test_import_annotations_respects_import_mode(
    fxt_new_task: Task, import_mode: str, expected_shape_count: int, tmp_path: Path
):
    labels = fxt_new_task.get_labels()
    fxt_new_task.set_annotations(
        models.LabeledDataRequest(
            shapes=[
                models.LabeledShapeRequest(
                    frame=0,
                    label_id=labels[0].id,
                    type="rectangle",
                    points=[1, 1, 2, 2],
                ),
            ],
        )
    )

    original_annotations = fxt_new_task.get_jobs()[0].get_annotations()
    assert len(original_annotations.shapes) == 1

    exported_dataset = fxt_new_task.export_dataset(
        format_name="CVAT for images 1.1",
        filename=tmp_path / "annotations.zip",
        include_images=False,
    )

    fxt_new_task.import_annotations(
        format_name="CVAT 1.1",
        filename=exported_dataset,
        import_mode=import_mode,
    )

    imported_annotations = fxt_new_task.get_jobs()[0].get_annotations()
    assert len(imported_annotations.shapes) == expected_shape_count
