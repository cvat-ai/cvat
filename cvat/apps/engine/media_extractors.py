# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import sysconfig
import tempfile
import shutil
import zipfile
import io
import itertools
import struct
from enum import IntEnum
from abc import ABC, abstractmethod
from contextlib import closing
from typing import Iterable

import av
import numpy as np
from natsort import os_sorted
from pyunpack import Archive
from PIL import Image, ImageFile, ImageOps
from random import shuffle
from cvat.apps.engine.utils import rotate_image
from cvat.apps.engine.models import DimensionType, SortingMethod
from rest_framework.exceptions import ValidationError

# fixes: "OSError:broken data stream" when executing line 72 while loading images downloaded from the web
# see: https://stackoverflow.com/questions/42462431/oserror-broken-data-stream-when-reading-image-file
ImageFile.LOAD_TRUNCATED_IMAGES = True

from cvat.apps.engine.mime_types import mimetypes
from utils.dataset_manifest import VideoManifestManager, ImageManifestManager

ORIENTATION_EXIF_TAG = 274

class ORIENTATION(IntEnum):
    NORMAL_HORIZONTAL=1
    MIRROR_HORIZONTAL=2
    NORMAL_180_ROTATED=3
    MIRROR_VERTICAL=4
    MIRROR_HORIZONTAL_270_ROTATED=5
    NORMAL_90_ROTATED=6
    MIRROR_HORIZONTAL_90_ROTATED=7
    NORMAL_270_ROTATED=8

def get_mime(name):
    for type_name, type_def in MEDIA_TYPES.items():
        if type_def['has_mime_type'](name):
            return type_name

    return 'unknown'

def create_tmp_dir():
    return tempfile.mkdtemp(prefix='cvat-', suffix='.data')

def delete_tmp_dir(tmp_dir):
    if tmp_dir:
        shutil.rmtree(tmp_dir)

def files_to_ignore(directory):
    ignore_files = ('__MSOSX', '._.DS_Store', '__MACOSX', '.DS_Store')
    if not any(ignore_file in directory for ignore_file in ignore_files):
        return True
    return False

def sort(images, sorting_method=SortingMethod.LEXICOGRAPHICAL, func=None):
    if sorting_method == SortingMethod.LEXICOGRAPHICAL:
        return sorted(images, key=func)
    elif sorting_method == SortingMethod.NATURAL:
        return os_sorted(images, key=func)
    elif sorting_method == SortingMethod.PREDEFINED:
        return images
    elif sorting_method == SortingMethod.RANDOM:
        shuffle(images)
        return images
    else:
        raise NotImplementedError()

def image_size_within_orientation(img: Image):
    orientation = img.getexif().get(ORIENTATION_EXIF_TAG, ORIENTATION.NORMAL_HORIZONTAL)
    if orientation > 4:
        return img.height, img.width
    return img.width, img.height

def has_exif_rotation(img: Image):
    return img.getexif().get(ORIENTATION_EXIF_TAG, ORIENTATION.NORMAL_HORIZONTAL) != ORIENTATION.NORMAL_HORIZONTAL

class IMediaReader(ABC):
    def __init__(self, source_path, step, start, stop, dimension):
        self._source_path = source_path
        self._step = step
        self._start = start
        self._stop = stop
        self._dimension = dimension

    @abstractmethod
    def __iter__(self):
        pass

    @abstractmethod
    def get_preview(self, frame):
        pass

    @abstractmethod
    def get_progress(self, pos):
        pass

    @staticmethod
    def _get_preview(obj):
        PREVIEW_SIZE = (256, 256)

        if isinstance(obj, io.IOBase):
            preview = Image.open(obj)
        else:
            preview = obj
        preview = ImageOps.exif_transpose(preview)
        # TODO - Check if the other formats work. I'm only interested in I;16 for now. Sorry @:-|
        # Summary:
        # Images in the Format I;16 definitely don't work. Most likely I;16B/L/N won't work as well.
        # Simple Conversion from I;16 to I/RGB/L doesn't work as well.
        #   Including any Intermediate Conversions doesn't work either. (eg. I;16 to I to L)
        # Seems like an internal Bug of PIL
        #     See Issue for further details: https://github.com/python-pillow/Pillow/issues/3011
        #     Issue was opened 2018, so don't expect any changes soon and work with manual conversions.
        mode: str = preview.mode
        if mode == "I;16":
            preview = np.array(preview, dtype=np.uint16) # 'I;16' := Unsigned Integer 16, Grayscale
            image = image - image.min()                  # In case the used range lies in [a, 2^16] with a > 0
            preview = preview / preview.max() * 255      # Downscale into real numbers of range [0, 255]
            preview = preview.astype(np.uint8)           # Floor to integers of range [0, 255]
            preview = Image.fromarray(preview, mode="L") # 'L' := Unsigned Integer 8, Grayscale
            preview = ImageOps.equalize(preview)         # The Images need equalization. High resolution with 16-bit but only small range that actually contains information
        preview.thumbnail(PREVIEW_SIZE)

        return preview

    @abstractmethod
    def get_image_size(self, i):
        pass

    def __len__(self):
        return len(self.frame_range)

    @property
    def frame_range(self):
        return range(self._start, self._stop, self._step)

class ImageListReader(IMediaReader):
    def __init__(self,
                source_path,
                step=1,
                start=0,
                stop=None,
                dimension=DimensionType.DIM_2D,
                sorting_method=SortingMethod.LEXICOGRAPHICAL):
        if not source_path:
            raise Exception('No image found')

        if not stop:
            stop = len(source_path)
        else:
            stop = min(len(source_path), stop + 1)
        step = max(step, 1)
        assert stop > start

        super().__init__(
            source_path=sort(source_path, sorting_method),
            step=step,
            start=start,
            stop=stop,
            dimension=dimension
        )

        self._sorting_method = sorting_method

    def __iter__(self):
        for i in range(self._start, self._stop, self._step):
            yield (self.get_image(i), self.get_path(i), i)

    def __contains__(self, media_file):
        return media_file in self._source_path

    def filter(self, callback):
        source_path = list(filter(callback, self._source_path))
        ImageListReader.__init__(
            self,
            source_path,
            step=self._step,
            start=self._start,
            stop=self._stop - 1,
            dimension=self._dimension,
            sorting_method=self._sorting_method
        )

    def get_path(self, i):
        return self._source_path[i]

    def get_image(self, i):
        return self._source_path[i]

    def get_progress(self, pos):
        return (pos - self._start + 1) / (self._stop - self._start)

    def get_preview(self, frame):
        if self._dimension == DimensionType.DIM_3D:
            fp = open(os.path.join(os.path.dirname(__file__), 'assets/3d_preview.jpeg'), "rb")
        else:
            fp = open(self._source_path[frame], "rb")
        return self._get_preview(fp)

    def get_image_size(self, i):
        if self._dimension == DimensionType.DIM_3D:
            with open(self.get_path(i), 'rb') as f:
                properties = ValidateDimension.get_pcd_properties(f)
                return int(properties["WIDTH"]),  int(properties["HEIGHT"])
        with Image.open(self._source_path[i]) as img:
            return image_size_within_orientation(img)

    def reconcile(self, source_files, step=1, start=0, stop=None, dimension=DimensionType.DIM_2D, sorting_method=None):
        # FIXME
        ImageListReader.__init__(self,
            source_path=source_files,
            step=step,
            start=start,
            stop=stop,
            sorting_method=sorting_method if sorting_method else self._sorting_method,
        )
        self._dimension = dimension

    @property
    def absolute_source_paths(self):
        return [self.get_path(idx) for idx, _ in enumerate(self._source_path)]

class DirectoryReader(ImageListReader):
    def __init__(self,
                source_path,
                step=1,
                start=0,
                stop=None,
                dimension=DimensionType.DIM_2D,
                sorting_method=SortingMethod.LEXICOGRAPHICAL):
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        super().__init__(
            source_path=image_paths,
            step=step,
            start=start,
            stop=stop,
            dimension=dimension,
            sorting_method=sorting_method,
        )

class ArchiveReader(DirectoryReader):
    def __init__(self,
                source_path,
                step=1,
                start=0,
                stop=None,
                dimension=DimensionType.DIM_2D,
                sorting_method=SortingMethod.LEXICOGRAPHICAL,
                extract_dir=None):

        self._archive_source = source_path[0]
        tmp_dir = extract_dir if extract_dir else os.path.dirname(source_path[0])
        patool_path = os.path.join(sysconfig.get_path('scripts'), 'patool')
        Archive(self._archive_source).extractall(tmp_dir, False, patool_path)
        if not extract_dir:
            os.remove(self._archive_source)
        super().__init__(
            source_path=[tmp_dir],
            step=step,
            start=start,
            stop=stop,
            dimension=dimension,
            sorting_method=sorting_method,
        )

class PdfReader(ImageListReader):
    def __init__(self,
                source_path,
                step=1,
                start=0,
                stop=None,
                dimension=DimensionType.DIM_2D,
                sorting_method=SortingMethod.LEXICOGRAPHICAL,
                extract_dir=None):
        if not source_path:
            raise Exception('No PDF found')

        self._pdf_source = source_path[0]

        _basename = os.path.splitext(os.path.basename(self._pdf_source))[0]
        _counter = itertools.count()
        def _make_name():
            for page_num in _counter:
                yield '{}{:09d}.jpeg'.format(_basename, page_num)

        from pdf2image import convert_from_path
        self._tmp_dir = extract_dir if extract_dir else os.path.dirname(source_path[0])
        os.makedirs(self._tmp_dir, exist_ok=True)

        # Avoid OOM: https://github.com/openvinotoolkit/cvat/issues/940
        paths = convert_from_path(self._pdf_source,
            last_page=stop, paths_only=True,
            output_folder=self._tmp_dir, fmt="jpeg", output_file=_make_name())

        if not extract_dir:
            os.remove(source_path[0])

        super().__init__(
            source_path=paths,
            step=step,
            start=start,
            stop=stop,
            dimension=dimension,
            sorting_method=sorting_method,
        )

class ZipReader(ImageListReader):
    def __init__(self,
                source_path,
                step=1,
                start=0,
                stop=None,
                dimension=DimensionType.DIM_2D,
                sorting_method=SortingMethod.LEXICOGRAPHICAL,
                extract_dir=None):
        self._zip_source = zipfile.ZipFile(source_path[0], mode='r')
        self.extract_dir = extract_dir
        file_list = [f for f in self._zip_source.namelist() if files_to_ignore(f) and get_mime(f) == 'image']
        super().__init__(file_list,
                        step=step,
                        start=start,
                        stop=stop,
                        dimension=dimension,
                        sorting_method=sorting_method)

    def __del__(self):
        self._zip_source.close()

    def get_preview(self, frame):
        if self._dimension == DimensionType.DIM_3D:
            # TODO
            fp = open(os.path.join(os.path.dirname(__file__), 'assets/3d_preview.jpeg'), "rb")
            return self._get_preview(fp)

        io_image = io.BytesIO(self._zip_source.read(self._source_path[frame]))
        return self._get_preview(io_image)

    def get_image_size(self, i):
        if self._dimension == DimensionType.DIM_3D:
            with open(self.get_path(i), 'rb') as f:
                properties = ValidateDimension.get_pcd_properties(f)
                return int(properties["WIDTH"]),  int(properties["HEIGHT"])
        with Image.open(io.BytesIO(self._zip_source.read(self._source_path[i]))) as img:
            return image_size_within_orientation(img)

    def get_image(self, i):
        if self._dimension == DimensionType.DIM_3D:
            return self.get_path(i)
        return io.BytesIO(self._zip_source.read(self._source_path[i]))

    def get_zip_filename(self):
        return self._zip_source.filename

    def get_path(self, i):
        if self._zip_source.filename:
            prefix = self._get_extract_prefix()
            return os.path.join(prefix, self._source_path[i])
        else: # necessary for mime_type definition
            return self._source_path[i]

    def __contains__(self, media_file):
        return super().__contains__(os.path.relpath(media_file, self._get_extract_prefix()))

    def _get_extract_prefix(self):
        return self.extract_dir or os.path.dirname(self._zip_source.filename)

    def reconcile(self, source_files, step=1, start=0, stop=None, dimension=DimensionType.DIM_2D, sorting_method=None):
        if source_files:
            # file list is expected to be a processed output of self.get_path()
            # which returns files with the output directory prefix
            prefix = self._get_extract_prefix()
            source_files = [os.path.relpath(fn, prefix) for fn in source_files]

        super().reconcile(
            source_files=source_files,
            step=step,
            start=start,
            stop=stop,
            dimension=dimension,
            sorting_method=sorting_method
        )

    def extract(self):
        self._zip_source.extractall(self._get_extract_prefix())
        if not self.extract_dir:
            os.remove(self._zip_source.filename)

class VideoReader(IMediaReader):
    def __init__(self, source_path, step=1, start=0, stop=None, dimension=DimensionType.DIM_2D):
        super().__init__(
            source_path=source_path,
            step=step,
            start=start,
            stop=stop + 1 if stop is not None else stop,
            dimension=dimension,
        )

    def _has_frame(self, i):
        if i >= self._start:
            if (i - self._start) % self._step == 0:
                if self._stop is None or i < self._stop:
                    return True

        return False

    def __iter__(self):
        with self._get_av_container() as container:
            stream = container.streams.video[0]
            stream.thread_type = 'AUTO'
            frame_num = 0
            for packet in container.demux(stream):
                for image in packet.decode():
                    frame_num += 1
                    if self._has_frame(frame_num - 1):
                        if packet.stream.metadata.get('rotate'):
                            pts = image.pts
                            image = av.VideoFrame().from_ndarray(
                                rotate_image(
                                    image.to_ndarray(format='bgr24'),
                                    360 - int(stream.metadata.get('rotate'))
                                ),
                                format ='bgr24'
                            )
                            image.pts = pts
                        yield (image, self._source_path[0], image.pts)

    def get_progress(self, pos):
        duration = self._get_duration()
        return pos / duration if duration else None

    def _get_av_container(self):
        if isinstance(self._source_path[0], io.BytesIO):
            self._source_path[0].seek(0) # required for re-reading
        return av.open(self._source_path[0])

    def _get_duration(self):
        with self._get_av_container() as container:
            stream = container.streams.video[0]
            duration = None
            if stream.duration:
                duration = stream.duration
            else:
                # may have a DURATION in format like "01:16:45.935000000"
                duration_str = stream.metadata.get("DURATION", None)
                tb_denominator = stream.time_base.denominator
                if duration_str and tb_denominator:
                    _hour, _min, _sec = duration_str.split(':')
                    duration_sec = 60*60*float(_hour) + 60*float(_min) + float(_sec)
                    duration = duration_sec * tb_denominator
            return duration

    def get_preview(self, frame):
        with self._get_av_container() as container:
            stream = container.streams.video[0]
            tb_denominator = stream.time_base.denominator
            needed_time = int((frame / stream.guessed_rate) * tb_denominator)
            container.seek(offset=needed_time, stream=stream)
            for packet in container.demux(stream):
                for frame in packet.decode():
                    return self._get_preview(frame.to_image() if not stream.metadata.get('rotate') \
                        else av.VideoFrame().from_ndarray(
                            rotate_image(
                                frame.to_ndarray(format='bgr24'),
                                360 - int(container.streams.video[0].metadata.get('rotate'))
                            ),
                            format ='bgr24'
                        ).to_image()
                    )

    def get_image_size(self, i):
        image = (next(iter(self)))[0]
        return image.width, image.height

class FragmentMediaReader:
    def __init__(self, chunk_number, chunk_size, start, stop, step=1):
        self._start = start
        self._stop = stop + 1 # up to the last inclusive
        self._step = step
        self._chunk_number = chunk_number
        self._chunk_size = chunk_size
        self._start_chunk_frame_number = \
            self._start + self._chunk_number * self._chunk_size * self._step
        self._end_chunk_frame_number = min(self._start_chunk_frame_number \
            + (self._chunk_size - 1) * self._step + 1, self._stop)
        self._frame_range = self._get_frame_range()

    @property
    def frame_range(self):
        return self._frame_range

    def _get_frame_range(self):
        frame_range = []
        for idx in range(self._start, self._stop, self._step):
            if idx < self._start_chunk_frame_number:
                continue
            elif idx < self._end_chunk_frame_number and \
                    not (idx - self._start_chunk_frame_number) % self._step:
                frame_range.append(idx)
            elif (idx - self._start_chunk_frame_number) % self._step:
                continue
            else:
                break
        return frame_range

class ImageDatasetManifestReader(FragmentMediaReader):
    def __init__(self, manifest_path, **kwargs):
        super().__init__(**kwargs)
        self._manifest = ImageManifestManager(manifest_path)
        self._manifest.init_index()

    def __iter__(self):
        for idx in self._frame_range:
            yield self._manifest[idx]

class VideoDatasetManifestReader(FragmentMediaReader):
    def __init__(self, manifest_path, **kwargs):
        self.source_path = kwargs.pop('source_path')
        super().__init__(**kwargs)
        self._manifest = VideoManifestManager(manifest_path)
        self._manifest.init_index()

    def _get_nearest_left_key_frame(self):
        if self._start_chunk_frame_number >= \
                self._manifest[len(self._manifest) - 1].get('number'):
            left_border = len(self._manifest) - 1
        else:
            left_border = 0
            delta = len(self._manifest)
            while delta:
                step = delta // 2
                cur_position = left_border + step
                if self._manifest[cur_position].get('number') < self._start_chunk_frame_number:
                    cur_position += 1
                    left_border = cur_position
                    delta -= step + 1
                else:
                    delta = step
            if self._manifest[cur_position].get('number') > self._start_chunk_frame_number:
                left_border -= 1
        frame_number = self._manifest[left_border].get('number')
        timestamp = self._manifest[left_border].get('pts')
        return frame_number, timestamp

    def __iter__(self):
        start_decode_frame_number, start_decode_timestamp = self._get_nearest_left_key_frame()
        with closing(av.open(self.source_path, mode='r')) as container:
            video_stream = next(stream for stream in container.streams if stream.type == 'video')
            video_stream.thread_type = 'AUTO'

            container.seek(offset=start_decode_timestamp, stream=video_stream)

            frame_number = start_decode_frame_number - 1
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    frame_number += 1
                    if frame_number in self._frame_range:
                        if video_stream.metadata.get('rotate'):
                            frame = av.VideoFrame().from_ndarray(
                                rotate_image(
                                    frame.to_ndarray(format='bgr24'),
                                    360 - int(container.streams.video[0].metadata.get('rotate'))
                                ),
                                format ='bgr24'
                            )
                        yield frame
                    elif frame_number < self._frame_range[-1]:
                        continue
                    else:
                        return

class IChunkWriter(ABC):
    def __init__(self, quality, dimension=DimensionType.DIM_2D):
        self._image_quality = quality
        self._dimension = dimension

    @staticmethod
    def _compress_image(source_image: av.VideoFrame | io.IOBase | Image.Image, quality: int) -> tuple[int, int, io.BytesIO]:
        image = None
        if isinstance(source_image, av.VideoFrame):
            image = source_image.to_image()
        elif isinstance(source_image, io.IOBase):
            with Image.open(source_image) as _img:
                image = ImageOps.exif_transpose(_img)
        elif isinstance(source_image, Image.Image):
            image = ImageOps.exif_transpose(source_image)

        assert image is not None

        # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
        if image.mode == "I":
            # Image mode is 32bit integer pixels.
            # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
            im_data = np.array(image)
            im_data = im_data * (2**8 / im_data.max())
            image = Image.fromarray(im_data.astype(np.int32))

        # TODO - Check if the other formats work. I'm only interested in I;16 for now. Sorry @:-|
        # Summary:
        # Images in the Format I;16 definitely don't work. Most likely I;16B/L/N won't work as well.
        # Simple Conversion from I;16 to I/RGB/L doesn't work as well.
        #   Including any Intermediate Conversions doesn't work either. (eg. I;16 to I to L)
        # Seems like an internal Bug of PIL
        #     See Issue for further details: https://github.com/python-pillow/Pillow/issues/3011
        #     Issue was opened 2018, so don't expect any changes soon and work with manual conversions.
        if image.mode == "I;16":
            image = np.array(image, dtype=np.uint16) # 'I;16' := Unsigned Integer 16, Grayscale
            image = image - image.min()              # In case the used range lies in [a, 2^16] with a > 0
            image = image / image.max() * 255        # Downscale into real numbers of range [0, 255]
            image = image.astype(np.uint8)           # Floor to integers of range [0, 255]
            image = Image.fromarray(image, mode="L") # 'L' := Unsigned Integer 8, Grayscale
            image = ImageOps.equalize(image)         # The Images need equalization. High resolution with 16-bit but only small range that actually contains information

        converted_image = image.convert('RGB')

        try:
            buf = io.BytesIO()
            converted_image.save(buf, format='JPEG', quality=quality, optimize=True)
            buf.seek(0)
            width, height = converted_image.size
            return width, height, buf
        finally:
            converted_image.close()

    @abstractmethod
    def save_as_chunk(self, images, chunk_path):
        pass

class ZipChunkWriter(IChunkWriter):
    IMAGE_EXT = 'jpeg'
    POINT_CLOUD_EXT = 'pcd'

    def _write_pcd_file(self, image: str|io.BytesIO) -> tuple[io.BytesIO, str, int, int]:
        image_buf = open(image, "rb") if isinstance(image, str) else image
        try:
            properties = ValidateDimension.get_pcd_properties(image_buf)
            w, h = int(properties["WIDTH"]), int(properties["HEIGHT"])
            image_buf.seek(0, 0)
            return io.BytesIO(image_buf.read()), self.POINT_CLOUD_EXT, w, h
        finally:
            if isinstance(image, str):
                image_buf.close()

    def save_as_chunk(self, images: Iterable[tuple[Image.Image|io.IOBase|str, str, str]], chunk_path: str):
        with zipfile.ZipFile(chunk_path, 'x') as zip_chunk:
            for idx, (image, path, _) in enumerate(images):
                ext = os.path.splitext(path)[1].replace('.', '')
                output = io.BytesIO()
                if self._dimension == DimensionType.DIM_2D:
                    # current version of Pillow applies exif rotation immediately when TIFF image opened
                    # and it removes rotation tag after that
                    # so, has_exif_rotation(image) will return False for TIFF images even if they were actually rotated
                    # and original files will be added to the archive (without applied rotation)
                    # that is why we need the second part of the condition
                    if has_exif_rotation(image) or image.format == 'TIFF':
                        rot_image = ImageOps.exif_transpose(image)
                        try:
                            if image.format == 'TIFF':
                                # https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html
                                # use loseless lzw compression for tiff images
                                rot_image.save(output, format='TIFF', compression='tiff_lzw')
                            else:
                                rot_image.save(
                                    output,
                                    # use format from original image, https://github.com/python-pillow/Pillow/issues/5527
                                    format=image.format if image.format else self.IMAGE_EXT,
                                    quality=100,
                                    subsampling=0
                                )
                        finally:
                            rot_image.close()
                    else:
                        output = path
                else:
                    output, ext = self._write_pcd_file(path)[0:2]
                arcname = '{:06d}.{}'.format(idx, ext)

                if isinstance(output, io.BytesIO):
                    zip_chunk.writestr(arcname, output.getvalue())
                else:
                    zip_chunk.write(filename=output, arcname=arcname)
        # return empty list because ZipChunkWriter write files as is
        # and does not decode it to know img size.
        return []

class ZipCompressedChunkWriter(ZipChunkWriter):
    def save_as_chunk(
        self,
        images: Iterable[tuple[Image.Image|io.IOBase|str, str, str]],
        chunk_path: str, *, compress_frames: bool = True, zip_compress_level: int = 0
    ):
        image_sizes = []
        with zipfile.ZipFile(chunk_path, 'x', compresslevel=zip_compress_level) as zip_chunk:
            for idx, (image, path, _) in enumerate(images):
                if self._dimension == DimensionType.DIM_2D:
                    if compress_frames:
                        w, h, image_buf = self._compress_image(image, self._image_quality)
                    else:
                        assert isinstance(image, io.IOBase)
                        image_buf = io.BytesIO(image.read())
                        with Image.open(image_buf) as img:
                            w, h = img.size
                    extension = self.IMAGE_EXT
                else:
                    image_buf, extension, w, h = self._write_pcd_file(path)
                image_sizes.append((w, h))
                arcname = '{:06d}.{}'.format(idx, extension)
                zip_chunk.writestr(arcname, image_buf.getvalue())
        return image_sizes

class Mpeg4ChunkWriter(IChunkWriter):
    FORMAT = 'mp4'
    MAX_MBS_PER_FRAME = 36864

    def __init__(self, quality=67):
        # translate inversed range [1:100] to [0:51]
        quality = round(51 * (100 - quality) / 99)
        super().__init__(quality)
        self._output_fps = 25
        try:
            codec = av.codec.Codec('libopenh264', 'w')
            self._codec_name = codec.name
            self._codec_opts = {
                'profile': 'constrained_baseline',
                'qmin': str(self._image_quality),
                'qmax': str(self._image_quality),
                'rc_mode': 'buffer',
            }
        except av.codec.codec.UnknownCodecError:
            codec = av.codec.Codec('libx264', 'w')
            self._codec_name = codec.name
            self._codec_opts = {
                "crf": str(self._image_quality),
                "preset": "ultrafast",
            }

    def _add_video_stream(self, container, w, h, rate, options):
        # x264 requires width and height must be divisible by 2 for yuv420p
        if h % 2:
            h += 1
        if w % 2:
            w += 1

        # libopenh264 has 4K limitations, https://github.com/cvat-ai/cvat/issues/7425
        if h * w > (self.MAX_MBS_PER_FRAME << 8):
            raise ValidationError(
                'The video codec being used does not support such high video resolution, refer https://github.com/cvat-ai/cvat/issues/7425'
            )

        video_stream = container.add_stream(self._codec_name, rate=rate)
        video_stream.pix_fmt = "yuv420p"
        video_stream.width = w
        video_stream.height = h
        video_stream.options = options

        return video_stream

    def save_as_chunk(self, images, chunk_path):
        if not images:
            raise Exception('no images to save')

        input_w = images[0][0].width
        input_h = images[0][0].height

        with av.open(chunk_path, 'w', format=self.FORMAT) as output_container:
            output_v_stream = self._add_video_stream(
                container=output_container,
                w=input_w,
                h=input_h,
                rate=self._output_fps,
                options=self._codec_opts,
            )

            self._encode_images(images, output_container, output_v_stream)
        return [(input_w, input_h)]

    @staticmethod
    def _encode_images(images, container, stream):
        for frame, _, _ in images:
            # let libav set the correct pts and time_base
            frame.pts = None
            frame.time_base = None

            for packet in stream.encode(frame):
                container.mux(packet)

        # Flush streams
        for packet in stream.encode():
            container.mux(packet)

class Mpeg4CompressedChunkWriter(Mpeg4ChunkWriter):
    def __init__(self, quality):
        super().__init__(quality)
        if self._codec_name == 'libx264':
            self._codec_opts = {
                'profile': 'baseline',
                'coder': '0',
                'crf': str(self._image_quality),
                'wpredp': '0',
                'flags': '-loop',
            }

    def save_as_chunk(self, images, chunk_path):
        if not images:
            raise Exception('no images to save')

        input_w = images[0][0].width
        input_h = images[0][0].height

        downscale_factor = 1
        while input_h / downscale_factor >= 1080:
            downscale_factor *= 2

        output_h = input_h // downscale_factor
        output_w = input_w // downscale_factor

        with av.open(chunk_path, 'w', format=self.FORMAT) as output_container:
            output_v_stream = self._add_video_stream(
                container=output_container,
                w=output_w,
                h=output_h,
                rate=self._output_fps,
                options=self._codec_opts,
            )

            self._encode_images(images, output_container, output_v_stream)
        return [(input_w, input_h)]

def _is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'application/gzip', 'application/x-bzip']
    return mime_type in supportedArchives or encoding in supportedArchives

def _is_video(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('video')

def _is_image(path):
    mime = mimetypes.guess_type(path)
    # Exclude vector graphic images because Pillow cannot work with them
    return mime[0] is not None and mime[0].startswith('image') and \
        not mime[0].startswith('image/svg')

def _is_dir(path):
    return os.path.isdir(path)

def _is_pdf(path):
    mime = mimetypes.guess_type(path)
    return mime[0] == 'application/pdf'

def _is_zip(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/zip']
    return mime_type in supportedArchives or encoding in supportedArchives

# 'has_mime_type': function receives 1 argument - path to file.
#                  Should return True if file has specified media type.
# 'extractor': class that extracts images from specified media.
# 'mode': 'annotation' or 'interpolation' - mode of task that should be created.
# 'unique': True or False - describes how the type can be combined with other.
#           True - only one item of this type and no other is allowed
#           False - this media types can be combined with other which have unique is False

MEDIA_TYPES = {
    'image': {
        'has_mime_type': _is_image,
        'extractor': ImageListReader,
        'mode': 'annotation',
        'unique': False,
    },
    'video': {
        'has_mime_type': _is_video,
        'extractor': VideoReader,
        'mode': 'interpolation',
        'unique': True,
    },
    'archive': {
        'has_mime_type': _is_archive,
        'extractor': ArchiveReader,
        'mode': 'annotation',
        'unique': True,
    },
    'directory': {
        'has_mime_type': _is_dir,
        'extractor': DirectoryReader,
        'mode': 'annotation',
        'unique': False,
    },
    'pdf': {
        'has_mime_type': _is_pdf,
        'extractor': PdfReader,
        'mode': 'annotation',
        'unique': True,
    },
    'zip': {
        'has_mime_type': _is_zip,
        'extractor': ZipReader,
        'mode': 'annotation',
        'unique': True,
    }
}

class ValidateDimension:

    def __init__(self, path=None):
        self.dimension = DimensionType.DIM_2D
        self.path = path
        self.related_files = {}
        self.image_files = {}
        self.converted_files = []

    @staticmethod
    def get_pcd_properties(fp, verify_version=False):
        kv = {}
        pcd_version = ["0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1",
                       ".7", ".6", ".5", ".4", ".3", ".2", ".1"]
        try:
            for line in fp:
                line = line.decode("utf-8")
                if line.startswith("#"):
                    continue
                k, v = line.split(" ", maxsplit=1)
                kv[k] = v.strip()
                if "DATA" in line:
                    break
            if verify_version:
                if "VERSION" in kv and kv["VERSION"] in pcd_version:
                    return True
                return None
            return kv
        except AttributeError:
            return None

    @staticmethod
    def convert_bin_to_pcd(path, delete_source=True):
        def write_header(fileObj, width, height):
            fileObj.writelines(f'{line}\n' for line in [
                'VERSION 0.7',
                'FIELDS x y z intensity',
                'SIZE 4 4 4 4',
                'TYPE F F F F',
                'COUNT 1 1 1 1',
                f'WIDTH {width}',
                f'HEIGHT {height}',
                'VIEWPOINT 0 0 0 1 0 0 0',
                f'POINTS {width * height}',
                'DATA binary',
            ])


        list_pcd = []
        with open(path, "rb") as f:
            size_float = 4
            byte = f.read(size_float * 4)
            while byte:
                x, y, z, intensity = struct.unpack("ffff", byte)
                list_pcd.append([x, y, z, intensity])
                byte = f.read(size_float * 4)
        np_pcd = np.asarray(list_pcd)
        pcd_filename = path.replace(".bin", ".pcd")
        with open(pcd_filename, "w") as f:
            write_header(f, np_pcd.shape[0], 1)
        with open(pcd_filename, "ab") as f:
            f.write(np_pcd.astype('float32').tobytes())
        if delete_source:
            os.remove(path)
        return pcd_filename

    def set_path(self, path):
        self.path = path

    def bin_operation(self, file_path, actual_path):
        pcd_path = ValidateDimension.convert_bin_to_pcd(file_path)
        self.converted_files.append(pcd_path)
        return pcd_path.split(actual_path)[-1][1:]

    @staticmethod
    def pcd_operation(file_path, actual_path):
        with open(file_path, "rb") as file:
            is_pcd = ValidateDimension.get_pcd_properties(file, verify_version=True)
        return file_path.split(actual_path)[-1][1:] if is_pcd else file_path

    def process_files(self, root, actual_path, files):
        pcd_files = {}

        for file in files:
            file_name, file_extension = os.path.splitext(file)
            file_path = os.path.abspath(os.path.join(root, file))

            if file_extension == ".bin":
                path = self.bin_operation(file_path, actual_path)
                pcd_files[file_name] = path
                self.related_files[path] = []

            elif file_extension == ".pcd":
                path = ValidateDimension.pcd_operation(file_path, actual_path)
                if path == file_path:
                    self.image_files[file_name] = file_path
                else:
                    pcd_files[file_name] = path
                    self.related_files[path] = []
            else:
                if _is_image(file_path):
                    self.image_files[file_name] = file_path
        return pcd_files

    def validate(self):
        """
            Validate the directory structure for kitty and point cloud format.
        """
        if not self.path:
            return
        actual_path = self.path
        for root, _, files in os.walk(actual_path):
            if not files_to_ignore(root):
                continue

            self.process_files(root, actual_path, files)

        if len(self.related_files.keys()):
            self.dimension = DimensionType.DIM_3D
