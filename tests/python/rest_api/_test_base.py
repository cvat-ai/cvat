import io
import math
import os
from collections.abc import Generator, Mapping, Sequence
from contextlib import closing
from functools import partial

import numpy as np
import pytest
from cvat_sdk.api_client import models
from PIL import Image
from pytest_cases import fixture, fixture_ref, parametrize

import shared.utils.s3 as s3
from rest_api.utils import calc_end_frame, create_task, iter_exclude, unique
from shared.tasks.enums import SourceDataType
from shared.tasks.interface import ITaskSpec
from shared.tasks.types import ImagesTaskSpec, VideoTaskSpec
from shared.tasks.utils import parse_frame_step
from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files, generate_video_file


class TestTasksBase:
    _USERNAME = "admin1"

    def _image_task_fxt_base(
        self,
        request: pytest.FixtureRequest,
        *,
        frame_count: int | None = 10,
        image_files: Sequence[io.BytesIO] | None = None,
        related_files: Mapping[int, Sequence[io.BytesIO]] | None = None,
        start_frame: int | None = None,
        stop_frame: int | None = None,
        step: int | None = None,
        segment_size: int | None = None,
        server_files: Sequence[str] | None = None,
        cloud_storage_id: int | None = None,
        job_replication: int | None = None,
        **data_kwargs,
    ) -> Generator[tuple[ImagesTaskSpec, int], None, None]:
        task_params = {
            "name": f"{request.node.name}[{request.fixturename}]",
            "labels": [{"name": "a"}],
            **({"segment_size": segment_size} if segment_size else {}),
            **({"consensus_replicas": job_replication} if job_replication else {}),
        }

        if server_files is not None:
            assert (
                image_files is not None
            ), "'server_files' must be used together with 'image_files'"
        else:
            assert bool(image_files) ^ bool(
                frame_count
            ), "Expected only one of 'image_files' and 'frame_count'"
            if not image_files:
                image_files = generate_image_files(frame_count)

        images_data = [f.getvalue() for f in image_files]

        resulting_task_size = len(
            range(start_frame or 0, (stop_frame or len(images_data) - 1) + 1, step or 1)
        )

        data_params = {
            "image_quality": 70,
            "sorting_method": "natural",
            "chunk_size": max(1, (segment_size or resulting_task_size) // 2),
            **(
                {
                    "server_files": server_files,
                    "cloud_storage_id": cloud_storage_id,
                }
                if server_files
                else {"client_files": image_files}
            ),
        }
        data_params.update(data_kwargs)

        if start_frame is not None:
            data_params["start_frame"] = start_frame

        if stop_frame is not None:
            data_params["stop_frame"] = stop_frame

        if step is not None:
            data_params["frame_filter"] = f"step={step}"

        def get_frame(i: int) -> bytes:
            return images_data[i]

        if related_files is not None:

            def get_related_files(i: int) -> Mapping[str, bytes]:
                frame_ri = related_files.get(i)
                common_prefix = os.path.commonpath(os.path.dirname(f.name) for f in frame_ri)
                return {os.path.relpath(f.name, common_prefix): f.getvalue() for f in frame_ri}

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)
        yield ImagesTaskSpec(
            models.TaskWriteRequest._from_openapi_data(**task_params),
            models.DataRequest._from_openapi_data(**data_params),
            get_frame=get_frame,
            get_related_files=get_related_files if related_files else None,
            size=resulting_task_size,
        ), task_id

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_fxt_base(request=request)

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_fxt_base(request=request, segment_size=4)

    @fixture(scope="class")
    @parametrize("step", [2, 5])
    @parametrize("stop_frame", [15, 26])
    @parametrize("start_frame", [3, 7])
    def fxt_uploaded_images_task_with_segments_start_stop_step(
        self, request: pytest.FixtureRequest, start_frame: int, stop_frame: int | None, step: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_fxt_base(
            request=request,
            frame_count=30,
            segment_size=4,
            start_frame=start_frame,
            stop_frame=stop_frame,
            step=step,
        )

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_segments_and_consensus(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_fxt_base(request=request, segment_size=4, job_replication=2)

    def _image_task_with_honeypots_and_segments_base(
        self,
        request: pytest.FixtureRequest,
        *,
        start_frame: int | None = None,
        step: int | None = None,
        random_seed: int = 42,
        image_files: Sequence[io.BytesIO] | None = None,
        server_files: Sequence[str] | None = None,
        cloud_storage_id: int | None = None,
        **kwargs,
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        validation_params = models.DataRequestValidationParams._from_openapi_data(
            mode="gt_pool",
            frame_selection_method="random_uniform",
            random_seed=random_seed,
            frame_count=5,
            frames_per_job_count=2,
        )

        used_frames_count = 15
        total_frame_count = (start_frame or 0) + used_frames_count * (step or 1)
        base_segment_size = 4
        regular_frame_count = used_frames_count - validation_params.frame_count
        final_segment_size = base_segment_size + validation_params.frames_per_job_count
        final_task_size = (
            regular_frame_count
            + validation_params.frames_per_job_count
            * math.ceil(regular_frame_count / base_segment_size)
            + validation_params.frame_count
        )

        if image_files:
            if len(image_files) != total_frame_count:
                raise ValueError(
                    f"If provided, image_files must contain {total_frame_count} images"
                )
        else:
            image_files = generate_image_files(total_frame_count)

        with closing(
            self._image_task_fxt_base(
                request=request,
                frame_count=None,
                image_files=image_files,
                segment_size=base_segment_size,
                sorting_method="random",
                start_frame=start_frame,
                step=step,
                validation_params=validation_params,
                server_files=server_files,
                cloud_storage_id=cloud_storage_id,
                **kwargs,
            )
        ) as task_gen:
            for task_spec, task_id in task_gen:
                # Get the actual frame order after the task is created
                with make_api_client(self._USERNAME) as api_client:
                    (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
                    frame_map = [
                        next(i for i, f in enumerate(image_files) if f.name == frame_info.name)
                        for frame_info in task_meta.frames
                    ]

                _get_frame = task_spec._get_frame
                task_spec._get_frame = lambda i: _get_frame(frame_map[i])

                task_spec.size = final_task_size
                task_spec._params.segment_size = final_segment_size

                # These parameters are not applicable to the resulting task,
                # they are only effective during task creation
                if start_frame or step:
                    task_spec._data_params.start_frame = 0
                    task_spec._data_params.stop_frame = task_spec.size
                    task_spec._data_params.frame_filter = ""

                yield task_spec, task_id

    @fixture(scope="class")
    def fxt_uploaded_images_task_with_honeypots_and_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_with_honeypots_and_segments_base(request)

    @fixture(scope="class")
    @parametrize("start_frame, step", [(2, 3)])
    def fxt_uploaded_images_task_with_honeypots_and_segments_start_step(
        self, request: pytest.FixtureRequest, start_frame: int | None, step: int | None
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._image_task_with_honeypots_and_segments_base(
            request, start_frame=start_frame, step=step
        )

    def _images_task_with_honeypots_and_changed_real_frames_base(
        self, request: pytest.FixtureRequest, **kwargs
    ):
        with closing(
            self._image_task_with_honeypots_and_segments_base(
                request, start_frame=2, step=3, **kwargs
            )
        ) as gen_iter:
            task_spec, task_id = next(gen_iter)

            with make_api_client(self._USERNAME) as api_client:
                validation_layout, _ = api_client.tasks_api.retrieve_validation_layout(task_id)
                validation_frames = validation_layout.validation_frames

                new_honeypot_real_frames = [
                    validation_frames[(validation_frames.index(f) + 1) % len(validation_frames)]
                    for f in validation_layout.honeypot_real_frames
                ]
                api_client.tasks_api.partial_update_validation_layout(
                    task_id,
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(
                            frame_selection_method="manual",
                            honeypot_real_frames=new_honeypot_real_frames,
                        )
                    ),
                )

                # Get the new frame order
                frame_map = dict(zip(validation_layout.honeypot_frames, new_honeypot_real_frames))

                _get_frame = task_spec._get_frame
                task_spec._get_frame = lambda i: _get_frame(frame_map.get(i, i))

            yield task_spec, task_id

    @fixture(scope="class")
    @parametrize("random_seed", [1, 2, 5])
    def fxt_uploaded_images_task_with_honeypots_and_changed_real_frames(
        self, request: pytest.FixtureRequest, random_seed: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._images_task_with_honeypots_and_changed_real_frames_base(
            request, random_seed=random_seed
        )

    @fixture(scope="class")
    @parametrize(
        "cloud_storage_id",
        [pytest.param(2, marks=[pytest.mark.with_external_services, pytest.mark.timeout(60)])],
    )
    def fxt_cloud_images_task_with_honeypots_and_changed_real_frames(
        self, request: pytest.FixtureRequest, cloud_storages, cloud_storage_id: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        cloud_storage = cloud_storages[cloud_storage_id]
        s3_client = s3.make_client(bucket=cloud_storage["resource"])

        image_files = generate_image_files(47)

        for image in image_files:
            image.name = f"test/{image.name}"
            image.seek(0)

            s3_client.create_file(data=image, filename=image.name)
            request.addfinalizer(partial(s3_client.remove_file, filename=image.name))

        server_files = [f.name for f in image_files]

        for image in image_files:
            image.seek(0)

        yield from self._images_task_with_honeypots_and_changed_real_frames_base(
            request,
            image_files=image_files,
            server_files=server_files,
            cloud_storage_id=cloud_storage_id,
            # FIXME: random sorting with frame filter and cloud images (and, optionally, honeypots)
            # doesn't work with static cache
            # https://github.com/cvat-ai/cvat/issues/9021
            use_cache=True,
        )

    def _uploaded_images_task_with_gt_and_segments_base(
        self,
        request: pytest.FixtureRequest,
        *,
        start_frame: int | None = None,
        step: int | None = None,
        frame_selection_method: str = "random_uniform",
        job_replication: int | None = None,
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        used_frames_count = 16
        total_frame_count = (start_frame or 0) + used_frames_count * (step or 1)
        segment_size = 5
        image_files = generate_image_files(total_frame_count)

        validation_params_kwargs = {"frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params_kwargs["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 10
            validation_params_kwargs["frame_count"] = validation_frames_count
        elif frame_selection_method == "random_per_job":
            frames_per_job_count = 3
            validation_params_kwargs["frames_per_job_count"] = frames_per_job_count
            validation_frames_count = used_frames_count // segment_size + min(
                used_frames_count % segment_size, frames_per_job_count
            )
        elif frame_selection_method == "manual":
            validation_frames_count = 10

            valid_frame_ids = range(
                (start_frame or 0), (start_frame or 0) + used_frames_count * (step or 1), step or 1
            )
            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params_kwargs["frames"] = rng.choice(
                [f.name for i, f in enumerate(image_files) if i in valid_frame_ids],
                validation_frames_count,
                replace=False,
            ).tolist()
        else:
            raise NotImplementedError

        validation_params = models.DataRequestValidationParams._from_openapi_data(
            mode="gt",
            **validation_params_kwargs,
        )

        yield from self._image_task_fxt_base(
            request=request,
            frame_count=None,
            image_files=image_files,
            segment_size=segment_size,
            sorting_method="natural",
            start_frame=start_frame,
            step=step,
            validation_params=validation_params,
            job_replication=job_replication,
        )

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_gt_and_segments_and_consensus(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_gt_and_segments_base(
            request=request, job_replication=2
        )

    @fixture(scope="class")
    @parametrize(
        "cloud_storage_id",
        [pytest.param(2, marks=[pytest.mark.with_external_services, pytest.mark.timeout(60)])],
    )
    def fxt_cloud_images_task_with_related_images(
        self, request: pytest.FixtureRequest, cloud_storages, cloud_storage_id: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        cloud_storage = cloud_storages[cloud_storage_id]
        s3_client = s3.make_client(bucket=cloud_storage["resource"])

        image_files = generate_image_files(5)

        def _upload_file(file: io.RawIOBase):
            s3_client.create_file(data=file, filename=file.name)
            request.addfinalizer(partial(s3_client.remove_file, filename=file.name))

        related_files = []

        for image in image_files:
            image.name = f"test/{image.name}"
            image.seek(0)
            _upload_file(image)

            image_related_files = generate_image_files(3)
            related_files.append(image_related_files)

            for related_file in image_related_files:
                assert related_file.name.endswith(".jpeg")
                related_file.name = "{}/related_images/{}/{}".format(
                    os.path.dirname(image.name),
                    os.path.basename(image.name).replace(".", "_"),
                    related_file.name,
                )
                related_file.seek(0)
                _upload_file(related_file)

        server_files = [f.name for f in image_files] + [
            f.name for rfs in related_files for f in rfs
        ]

        for image in image_files:
            image.seek(0)

        yield from self._image_task_fxt_base(
            request,
            image_files=image_files,
            related_files=dict(enumerate(related_files)),
            server_files=server_files,
            cloud_storage_id=cloud_storage_id,
        )

    @fixture(scope="class")
    @parametrize(
        "cloud_storage_id",
        [pytest.param(1, marks=[pytest.mark.with_external_services, pytest.mark.timeout(60)])],
    )
    def fxt_cloud_pcd_task_with_related_images(
        self, request: pytest.FixtureRequest, cloud_storages, cloud_storage_id: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        cloud_storage = cloud_storages[cloud_storage_id]
        s3_client = s3.make_client(bucket=cloud_storage["resource"])

        server_files = [
            "pcd_with_related/pointcloud/000001.pcd",
            "pcd_with_related/pointcloud/000002.pcd",
            "pcd_with_related/pointcloud/000003.pcd",
            "pcd_with_related/related_images/000001_pcd/000001.png",
            "pcd_with_related/related_images/000002_pcd/000002.png",
            "pcd_with_related/related_images/000003_pcd/000003.png",
        ]

        pcd_files = []
        for filename in [
            "pcd_with_related/pointcloud/000001.pcd",
            "pcd_with_related/pointcloud/000002.pcd",
            "pcd_with_related/pointcloud/000003.pcd",
        ]:
            pcd_file = io.BytesIO(s3_client.download_fileobj(filename))
            pcd_file.name = filename
            pcd_files.append(pcd_file)

        related_files = []
        for filename in [
            "pcd_with_related/related_images/000001_pcd/000001.png",
            "pcd_with_related/related_images/000002_pcd/000002.png",
            "pcd_with_related/related_images/000003_pcd/000003.png",
        ]:
            ri_file = io.BytesIO(s3_client.download_fileobj(filename))
            ri_file.name = os.path.basename(filename)
            related_files.append([ri_file])

        yield from self._image_task_fxt_base(
            request,
            image_files=pcd_files,
            related_files=dict(enumerate(related_files)),
            server_files=server_files,
            cloud_storage_id=cloud_storage_id,
        )

    @fixture(scope="class")
    @parametrize("start_frame, step", [(2, 3)])
    @parametrize("frame_selection_method", ["random_uniform", "random_per_job", "manual"])
    def fxt_uploaded_images_task_with_gt_and_segments_start_step(
        self,
        request: pytest.FixtureRequest,
        start_frame: int | None,
        step: int | None,
        frame_selection_method: str,
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_gt_and_segments_base(
            request,
            start_frame=start_frame,
            step=step,
            frame_selection_method=frame_selection_method,
        )

    def _uploaded_video_task_fxt_base(
        self,
        request: pytest.FixtureRequest,
        *,
        frame_count: int = 10,
        segment_size: int | None = None,
        start_frame: int | None = None,
        stop_frame: int | None = None,
        step: int | None = None,
    ) -> Generator[tuple[VideoTaskSpec, int], None, None]:
        task_params = {
            "name": f"{request.node.name}[{request.fixturename}]",
            "labels": [{"name": "a"}],
        }
        if segment_size:
            task_params["segment_size"] = segment_size

        resulting_task_size = len(
            range(start_frame or 0, (stop_frame or frame_count - 1) + 1, step or 1)
        )

        video_file = generate_video_file(frame_count)
        video_data = video_file.getvalue()
        data_params = {
            "image_quality": 70,
            "client_files": [video_file],
            "chunk_size": max(1, (segment_size or resulting_task_size) // 2),
        }

        if start_frame is not None:
            data_params["start_frame"] = start_frame

        if stop_frame is not None:
            data_params["stop_frame"] = stop_frame

        if step is not None:
            data_params["frame_filter"] = f"step={step}"

        def get_video_file() -> io.BytesIO:
            return io.BytesIO(video_data)

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)
        yield VideoTaskSpec(
            models.TaskWriteRequest._from_openapi_data(**task_params),
            models.DataRequest._from_openapi_data(**data_params),
            get_video_file=get_video_file,
            size=resulting_task_size,
        ), task_id

    @pytest.fixture(scope="class")
    def fxt_uploaded_video_task(
        self,
        request: pytest.FixtureRequest,
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(request=request)

    @pytest.fixture(scope="class")
    def fxt_uploaded_video_task_with_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(request=request, segment_size=4)

    @fixture(scope="class")
    @parametrize("step", [2, 5])
    @parametrize("stop_frame", [15, 26])
    @parametrize("start_frame", [3, 7])
    def fxt_uploaded_video_task_with_segments_start_stop_step(
        self, request: pytest.FixtureRequest, start_frame: int, stop_frame: int | None, step: int
    ) -> Generator[tuple[ITaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(
            request=request,
            frame_count=30,
            segment_size=4,
            start_frame=start_frame,
            stop_frame=stop_frame,
            step=step,
        )

    def _compute_annotation_segment_params(self, task_spec: ITaskSpec) -> list[tuple[int, int]]:
        segment_params = []
        frame_step = task_spec.frame_step
        segment_size = getattr(task_spec, "segment_size", 0) or task_spec.size * frame_step
        start_frame = getattr(task_spec, "start_frame", 0)
        stop_frame = getattr(task_spec, "stop_frame", None) or (
            start_frame + (task_spec.size - 1) * frame_step
        )
        end_frame = calc_end_frame(start_frame, stop_frame, frame_step)

        validation_params = getattr(task_spec, "validation_params", None)
        if validation_params and validation_params.mode.value == "gt_pool":
            end_frame = min(
                end_frame, (task_spec.size - validation_params.frame_count) * frame_step
            )
            segment_size = min(segment_size, end_frame - 1)

        overlap = min(
            (
                getattr(task_spec, "overlap", None) or 0
                if task_spec.source_data_type == SourceDataType.images
                else 5
            ),
            segment_size // 2,
        )
        segment_start = start_frame
        while segment_start < end_frame:
            if start_frame < segment_start:
                segment_start -= overlap * frame_step

            segment_end = segment_start + frame_step * segment_size

            segment_params.append((segment_start, min(segment_end, end_frame) - frame_step))
            segment_start = segment_end

        return segment_params

    @staticmethod
    def _compare_images(
        expected: Image.Image, actual: Image.Image, *, must_be_identical: bool = True
    ):
        expected_pixels = np.array(expected)
        chunk_frame_pixels = np.array(actual)
        assert expected_pixels.shape == chunk_frame_pixels.shape

        if not must_be_identical:
            # video chunks can have slightly changed colors, due to codec specifics
            # compressed images can also be distorted
            assert np.allclose(chunk_frame_pixels, expected_pixels, atol=2)
        else:
            assert np.array_equal(chunk_frame_pixels, expected_pixels)

    def _get_job_abs_frame_set(self, job_meta: models.DataMetaRead) -> Sequence[int]:
        if job_meta.included_frames:
            return job_meta.included_frames
        else:
            return range(
                job_meta.start_frame,
                job_meta.stop_frame + 1,
                parse_frame_step(job_meta.frame_filter),
            )

    _tasks_with_honeypots_cases = [
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_segments"),
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_segments_start_step"),
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_changed_real_frames"),
        fixture_ref("fxt_cloud_images_task_with_honeypots_and_changed_real_frames"),
    ]

    _tasks_with_simple_gt_job_cases = [
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_start_step"),
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_and_consensus"),
    ]

    _tasks_with_consensus_cases = [
        fixture_ref("fxt_uploaded_images_task_with_segments_and_consensus"),
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_and_consensus"),
    ]

    _tests_with_cloud_storage_cases = [
        fixture_ref("fxt_cloud_images_task_with_honeypots_and_changed_real_frames"),
        fixture_ref("fxt_cloud_images_task_with_related_images"),
    ]

    _tests_with_related_files_cases = [
        fixture_ref("fxt_cloud_images_task_with_related_images"),
        fixture_ref("fxt_cloud_pcd_task_with_related_images"),
    ]

    _3d_task_cases = [
        fixture_ref("fxt_cloud_pcd_task_with_related_images"),
    ]

    # Keep in mind that these fixtures are generated eagerly
    # (before each depending test or group of tests),
    # e.g. a failing task creation in one the fixtures will fail all the depending tests cases.
    _all_task_cases = unique(
        [
            fixture_ref("fxt_uploaded_images_task"),
            fixture_ref("fxt_uploaded_images_task_with_segments"),
            fixture_ref("fxt_uploaded_images_task_with_segments_start_stop_step"),
            fixture_ref("fxt_uploaded_video_task"),
            fixture_ref("fxt_uploaded_video_task_with_segments"),
            fixture_ref("fxt_uploaded_video_task_with_segments_start_stop_step"),
        ]
        + _tasks_with_honeypots_cases
        + _tasks_with_simple_gt_job_cases
        + _tasks_with_consensus_cases
        + _tests_with_cloud_storage_cases
        + _tests_with_related_files_cases,
        key=lambda fxt_ref: fxt_ref.fixture,
    )

    _2d_task_cases = list(
        iter_exclude(
            _all_task_cases,
            excludes=set(v.fixture for v in _3d_task_cases),
            key=lambda v: v.fixture,
        )
    )
