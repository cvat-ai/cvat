# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path
from zipfile import ZipFile

import pytest
from cvat_sdk import Client
from PIL import Image

from shared.utils.config import BASE_URL, USER_PASS
from shared.utils.helpers import generate_image_file

from .util import generate_coco_json


@pytest.fixture
def fxt_client(fxt_logger):
    logger, _ = fxt_logger

    client = Client(BASE_URL, logger=logger)
    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger
    client.config.status_check_period = 0.01

    with client:
        yield client


@pytest.fixture
def fxt_image_file(tmp_path: Path):
    img_path = tmp_path / "img.png"
    with img_path.open("wb") as f:
        f.write(generate_image_file(filename=str(img_path), size=(5, 10)).getvalue())

    return img_path


@pytest.fixture
def fxt_coco_file(tmp_path: Path, fxt_image_file: Path):
    img_filename = fxt_image_file
    img_size = Image.open(img_filename).size
    ann_filename = tmp_path / "coco.json"
    generate_coco_json(ann_filename, img_info=(img_filename, *img_size))

    yield ann_filename


@pytest.fixture(scope="class")
def fxt_login(admin_user: str, restore_db_per_class):
    client = Client(BASE_URL)
    client.config.status_check_period = 0.01
    user = admin_user

    with client:
        client.login((user, USER_PASS))
        yield (client, user)


@pytest.fixture
def fxt_coco_dataset(tmp_path: Path, fxt_image_file: Path, fxt_coco_file: Path):
    dataset_path = tmp_path / "coco_dataset.zip"
    with ZipFile(dataset_path, "x") as f:
        f.write(fxt_image_file, arcname="images/" + fxt_image_file.name)
        f.write(fxt_coco_file, arcname="annotations/instances_default.json")

    yield dataset_path
