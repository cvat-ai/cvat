# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import pytest
from cvat_sdk.api_client import models
from cvat_sdk.core.proxies.tasks import Task


@pytest.mark.parametrize("target_type", ["task", "job"])
@pytest.mark.parametrize(
    ("import_mode", "expected_shape_count"),
    [
        ("replace", 1),
        ("append", 2),
    ],
)
def test_import_annotations_respects_import_mode(
    fxt_new_task: Task,
    target_type: str,
    import_mode: str,
    expected_shape_count: int,
    tmp_path: Path,
):
    labels = fxt_new_task.get_labels()
    target = fxt_new_task if target_type == "task" else fxt_new_task.get_jobs()[0]

    target.set_annotations(
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

    original_annotations = target.get_annotations()
    assert len(original_annotations.shapes) == 1

    exported_dataset = target.export_dataset(
        format_name="CVAT for images 1.1",
        filename=tmp_path / f"{target_type}_annotations.zip",
        include_images=False,
    )

    target.import_annotations(
        format_name="CVAT 1.1",
        filename=exported_dataset,
        import_mode=import_mode,
    )

    imported_annotations = target.get_annotations()
    assert len(imported_annotations.shapes) == expected_shape_count
