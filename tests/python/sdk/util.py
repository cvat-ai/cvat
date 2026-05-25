# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from collections.abc import Container
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import pytest
from cvat_sdk.api_client import models
from cvat_sdk.api_client.rest import RESTClientObject
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter

from rest_api.utils import register_new_user
from shared.utils.config import make_sdk_client


def make_pbar(file, **kwargs):
    return DeferredTqdmProgressReporter({"file": file, "mininterval": 0, **kwargs})


def generate_coco_json(filename: Path, img_info: tuple[Path, int, int]):
    image_filename, image_width, image_height = img_info

    content = generate_coco_anno(
        image_filename.name,
        image_width=image_width,
        image_height=image_height,
    )
    with open(filename, "w") as coco:
        coco.write(content)


def generate_coco_anno(image_path: str, image_width: int, image_height: int) -> str:
    return (
        textwrap.dedent("""
    {
        "categories": [
            {
                "id": 1,
                "name": "car",
                "supercategory": ""
            },
            {
                "id": 2,
                "name": "person",
                "supercategory": ""
            }
        ],
        "images": [
            {
                "coco_url": "",
                "date_captured": "",
                "flickr_url": "",
                "license": 0,
                "id": 0,
                "file_name": "%(image_path)s",
                "height": %(image_height)d,
                "width": %(image_width)d
            }
        ],
        "annotations": [
            {
                "category_id": 1,
                "id": 1,
                "image_id": 0,
                "iscrowd": 0,
                "segmentation": [
                    []
                ],
                "area": 17702.0,
                "bbox": [
                    574.0,
                    407.0,
                    167.0,
                    106.0
                ]
            }
        ]
    }
    """)
        % {
            "image_path": image_path,
            "image_height": image_height,
            "image_width": image_width,
        }
    )


def restrict_api_requests(
    monkeypatch: pytest.MonkeyPatch, allow_paths: Container[str] = ()
) -> None:
    original_request = RESTClientObject.request

    def restricted_request(self, method, url, *args, **kwargs):
        parsed_url = urlparse(url)
        if parsed_url.path in allow_paths:
            return original_request(self, method, url, *args, **kwargs)
        raise RuntimeError("Disallowed!")

    monkeypatch.setattr(RESTClientObject, "request", restricted_request)


@dataclass(frozen=True)
class OrgResourceHierarchy:
    owner_username: str
    maintainer_username: str
    org_slug: str
    project_id: int
    task_id: int
    job_id: int
    issue_id: int | None = None
    comment_id: int | None = None


def create_org_resource_hierarchy(
    image_path: Path, *, include_issue: bool = False, include_comment: bool = False
) -> OrgResourceHierarchy:
    suffix = uuid4().hex[:6]
    owner = register_new_user(f"sdkown{suffix}")
    maintainer = register_new_user(f"sdkmnt{suffix}")

    with make_sdk_client(owner["username"]) as owner_client:
        org = owner_client.organizations.create(
            models.OrganizationWriteRequest(slug=f"sdk{suffix}")
        )
        owner_client.organization_slug = org.slug
        owner_client.api_client.invitations_api.create(
            models.InvitationWriteRequest(
                role="maintainer",
                email=maintainer["email"],
            ),
        )

        project = owner_client.projects.create(
            spec=models.ProjectWriteRequest(
                name="org project",
                labels=[models.PatchedLabelRequest(name="car")],
            )
        )
        task = owner_client.tasks.create_from_data(
            spec=models.TaskWriteRequest(name="org task", project_id=project.id),
            resources=[image_path],
            data_params={"image_quality": 80},
        )
        job = task.get_jobs()[0]

        issue_id = None
        comment_id = None

        if include_issue or include_comment:
            issue = owner_client.issues.create(
                models.IssueWriteRequest(
                    frame=0,
                    position=[2.0, 4.0],
                    job=job.id,
                    message="hello",
                )
            )
            issue_id = issue.id

            if include_comment:
                comment = owner_client.comments.create(
                    models.CommentWriteRequest(issue.id, message="hi!")
                )
                comment_id = comment.id

    return OrgResourceHierarchy(
        owner_username=owner["username"],
        maintainer_username=maintainer["username"],
        org_slug=org.slug,
        project_id=project.id,
        task_id=task.id,
        job_id=job.id,
        issue_id=issue_id,
        comment_id=comment_id,
    )
