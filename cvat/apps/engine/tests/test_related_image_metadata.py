# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import unittest
from pathlib import PurePath

from utils.dataset_manifest.errors import InvalidRelatedImageMetadataError
from utils.dataset_manifest.utils import MemOpenable, RelatedImageMetadata, find_related_images


class TestRelatedImageMetadata(unittest.TestCase):
    _INTRINSIC_MATRIX = (721.5, 0, 609.6, 0, 721.5, 172.9, 0, 0, 1)
    _EXTRINSIC_MATRIX = (1, 0, 0, 0.2, 0, 1, 0, 0, 0, 0, 1, 1.7)

    def _get_loader(self, sidecar_format):
        if sidecar_format == "cvat":
            dataset_paths = [PurePath("scene.pcd"), PurePath("scene.png")]
            related_image_path = PurePath("scene.png")
        elif sidecar_format == "sly":
            dataset_paths = [
                PurePath("pointcloud/scene.pcd"),
                PurePath("related_images/scene_pcd/camera.png"),
            ]
            related_image_path = PurePath("related_images/scene_pcd/camera.png")
        else:
            raise ValueError(f"Unsupported sidecar format: {sidecar_format}")

        _, _, loaders = find_related_images(dataset_paths)
        return loaders[related_image_path]

    def _load_metadata(self, sidecar_format, sidecar):
        loader = self._get_loader(sidecar_format)
        if sidecar_format == "cvat":
            sidecar_path = PurePath("scene.png.json")
        elif sidecar_format == "sly":
            sidecar_path = PurePath("related_images/scene_pcd/camera.png.json")
        else:
            raise ValueError(f"Unsupported sidecar format: {sidecar_format}")

        return loader(
            lambda path: MemOpenable(json.dumps(sidecar).encode()) if path == sidecar_path else None
        )

    def _make_sidecar(self, sidecar_format):
        if sidecar_format == "cvat":
            return {
                "format": "cvat-image-meta",
                "version": 1,
                "camera": {
                    "intrinsic_matrix": [
                        list(self._INTRINSIC_MATRIX[index : index + 3])
                        for index in range(0, len(self._INTRINSIC_MATRIX), 3)
                    ],
                },
                "extrinsic_matrix": [
                    list(self._EXTRINSIC_MATRIX[index : index + 4])
                    for index in range(0, len(self._EXTRINSIC_MATRIX), 4)
                ],
            }

        if sidecar_format == "sly":
            return {
                "meta": {
                    "sensorsData": {
                        "intrinsicMatrix": list(self._INTRINSIC_MATRIX),
                        "extrinsicMatrix": list(self._EXTRINSIC_MATRIX),
                    },
                },
            }

        raise ValueError(f"Unsupported sidecar format: {sidecar_format}")

    def _get_matrix(self, sidecar_format, sidecar, matrix_name):
        if sidecar_format == "cvat":
            container = sidecar["camera"] if matrix_name == "intrinsic" else sidecar
            key = f"{matrix_name}_matrix"
        elif sidecar_format == "sly":
            container = sidecar["meta"]["sensorsData"]
            key = f"{matrix_name}Matrix"
        else:
            raise ValueError(f"Unsupported sidecar format: {sidecar_format}")

        return container, key

    def test_loads_valid_calibration(self):
        expected_metadata = RelatedImageMetadata(
            intrinsic_matrix=[float(value) for value in self._INTRINSIC_MATRIX],
            extrinsic_matrix=[float(value) for value in self._EXTRINSIC_MATRIX],
        )

        for sidecar_format in ("cvat", "sly"):
            with self.subTest(sidecar_format=sidecar_format):
                self.assertEqual(
                    self._load_metadata(sidecar_format, self._make_sidecar(sidecar_format)),
                    expected_metadata,
                )

    def test_rejects_missing_or_malformed_matrices(self):
        invalid_values = {
            "missing": None,
            "wrong_shape": [[1, 0, 0]],
            "wrong_type": "not a matrix",
            "non_finite": float("nan"),
        }

        for sidecar_format in ("cvat", "sly"):
            for matrix_name in ("intrinsic", "extrinsic"):
                for invalid_case, invalid_value in invalid_values.items():
                    with self.subTest(
                        sidecar_format=sidecar_format,
                        matrix_name=matrix_name,
                        invalid_case=invalid_case,
                    ):
                        sidecar = self._make_sidecar(sidecar_format)
                        container, key = self._get_matrix(sidecar_format, sidecar, matrix_name)
                        if invalid_case == "missing":
                            del container[key]
                        elif invalid_case == "non_finite":
                            if sidecar_format == "cvat":
                                container[key][0][0] = invalid_value
                            elif sidecar_format == "sly":
                                container[key][0] = invalid_value
                            else:
                                raise ValueError(f"Unsupported sidecar format: {sidecar_format}")
                        else:
                            container[key] = invalid_value

                        with self.assertRaises(InvalidRelatedImageMetadataError):
                            self._load_metadata(sidecar_format, sidecar)

    def test_rejects_singular_intrinsic_and_invalid_rotation(self):
        invalid_calibrations = {
            "singular_intrinsic": ("intrinsic", [0] * 9),
            "non_rigid_rotation": ("extrinsic", [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]),
            "reflected_rotation": ("extrinsic", [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]),
        }

        for sidecar_format in ("cvat", "sly"):
            for invalid_case, (matrix_name, matrix) in invalid_calibrations.items():
                with self.subTest(sidecar_format=sidecar_format, invalid_case=invalid_case):
                    sidecar = self._make_sidecar(sidecar_format)
                    container, key = self._get_matrix(sidecar_format, sidecar, matrix_name)
                    columns = 3 if matrix_name == "intrinsic" else 4
                    if sidecar_format == "cvat":
                        container[key] = [
                            matrix[index : index + columns]
                            for index in range(0, len(matrix), columns)
                        ]
                    elif sidecar_format == "sly":
                        container[key] = matrix
                    else:
                        raise ValueError(f"Unsupported sidecar format: {sidecar_format}")

                    with self.assertRaises(InvalidRelatedImageMetadataError):
                        self._load_metadata(sidecar_format, sidecar)

    def test_rejects_unsupported_cvat_version_and_structure(self):
        invalid_sidecars = {
            "unsupported_version": {"version": 2},
            "invalid_camera_structure": {"camera": []},
        }

        for invalid_case, changes in invalid_sidecars.items():
            with self.subTest(invalid_case=invalid_case):
                sidecar = self._make_sidecar("cvat")
                sidecar.update(changes)

                with self.assertRaises(InvalidRelatedImageMetadataError):
                    self._load_metadata("cvat", sidecar)

    def test_sly_sidecar_without_sensors_data_is_uncalibrated(self):
        self.assertIsNone(self._load_metadata("sly", {"meta": {}}))
