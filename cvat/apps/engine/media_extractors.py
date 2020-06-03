# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import tempfile
import shutil
import zipfile
import io
from abc import ABC, abstractmethod

import av
import av.datasets
import numpy as np
from pyunpack import Archive
from PIL import Image, ImageFile

# fixes: "OSError:broken data stream" when executing line 72 while loading images downloaded from the web
# see: https://stackoverflow.com/questions/42462431/oserror-broken-data-stream-when-reading-image-file
ImageFile.LOAD_TRUNCATED_IMAGES = True

from cvat.apps.engine.mime_types import mimetypes

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

class IMediaReader(ABC):
    def __init__(self, source_path, step, start, stop):
        self._source_path = sorted(source_path)
        self._step = step
        self._start = start
        self._stop = stop

    @abstractmethod
    def __iter__(self):
        pass

    @abstractmethod
    def get_preview(self):
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
        preview.thumbnail(PREVIEW_SIZE)

        return preview.convert('RGB')

    @abstractmethod
    def get_image_size(self):
        pass

class ImageListReader(IMediaReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
        if not source_path:
            raise Exception('No image found')

        if stop is None:
            stop = len(source_path)
        else:
            stop = min(len(source_path), stop + 1)
        step = max(step, 1)
        assert stop > start

        super().__init__(
            source_path=source_path,
            step=step,
            start=start,
            stop=stop,
        )

    def __iter__(self):
        for i in range(self._start, self._stop, self._step):
            yield (self.get_image(i), self.get_path(i), i)

    def get_path(self, i):
        return self._source_path[i]

    def get_image(self, i):
        return self._source_path[i]

    def get_progress(self, pos):
        return (pos - self._start + 1) / (self._stop - self._start)

    def get_preview(self):
        fp = open(self._source_path[0], "rb")
        return self._get_preview(fp)

    def get_image_size(self):
        img = Image.open(self._source_path[0])
        return img.width, img.height

class DirectoryReader(ImageListReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
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
        )

class ArchiveReader(DirectoryReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
        self._tmp_dir = create_tmp_dir()
        self._archive_source = source_path[0]
        Archive(self._archive_source).extractall(self._tmp_dir)
        super().__init__(
            source_path=[self._tmp_dir],
            step=step,
            start=start,
            stop=stop,
        )

    def __del__(self):
        delete_tmp_dir(self._tmp_dir)

    def get_path(self, i):
        base_dir = os.path.dirname(self._archive_source)
        return os.path.join(base_dir, os.path.relpath(self._source_path[i], self._tmp_dir))

class PdfReader(DirectoryReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
        if not source_path:
            raise Exception('No PDF found')

        from pdf2image import convert_from_path
        self._pdf_source = source_path[0]
        self._tmp_dir = create_tmp_dir()
        file_ = convert_from_path(self._pdf_source)
        basename = os.path.splitext(os.path.basename(self._pdf_source))[0]
        for page_num, page in enumerate(file_):
            output = os.path.join(self._tmp_dir, '{}{:09d}.jpeg'.format(basename, page_num))
            page.save(output, 'JPEG')

        super().__init__(
            source_path=[self._tmp_dir],
            step=step,
            start=start,
            stop=stop,
        )

    def __del__(self):
        delete_tmp_dir(self._tmp_dir)

    def get_path(self, i):
        base_dir = os.path.dirname(self._pdf_source)
        return os.path.join(base_dir, os.path.relpath(self._source_path[i], self._tmp_dir))

class ZipReader(ImageListReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
        self._zip_source = zipfile.ZipFile(source_path[0], mode='r')
        file_list = [f for f in self._zip_source.namelist() if get_mime(f) == 'image']
        super().__init__(file_list, step, start, stop)

    def __del__(self):
        self._zip_source.close()

    def get_preview(self):
        io_image = io.BytesIO(self._zip_source.read(self._source_path[0]))
        return self._get_preview(io_image)

    def get_image_size(self):
        img = Image.open(io.BytesIO(self._zip_source.read(self._source_path[0])))
        return img.width, img.height

    def get_image(self, i):
        return io.BytesIO(self._zip_source.read(self._source_path[i]))

    def get_path(self, i):
        return os.path.join(os.path.dirname(self._zip_source.filename), self._source_path[i])

class VideoReader(IMediaReader):
    def __init__(self, source_path, step=1, start=0, stop=None):
        super().__init__(
            source_path=source_path,
            step=step,
            start=start,
            stop=stop + 1 if stop is not None else stop,
        )

    def _has_frame(self, i):
        if i >= self._start:
            if (i - self._start) % self._step == 0:
                if self._stop is None or i < self._stop:
                    return True

        return False

    def _decode(self, container):
        frame_num = 0
        for packet in container.demux():
            if packet.stream.type == 'video':
                for image in packet.decode():
                    frame_num += 1
                    if self._has_frame(frame_num - 1):
                        yield (image, self._source_path[0], image.pts)

    def __iter__(self):
        container = self._get_av_container()
        source_video_stream = container.streams.video[0]
        source_video_stream.thread_type = 'AUTO'

        return self._decode(container)

    def get_progress(self, pos):
        container = self._get_av_container()
        # Not for all containers return real value
        stream = container.streams.video[0]
        return pos / stream.duration if stream.duration else None

    def _get_av_container(self):
        return av.open(av.datasets.curated(self._source_path[0]))

    def get_preview(self):
        container = self._get_av_container()
        stream = container.streams.video[0]
        preview = next(container.decode(stream))
        return self._get_preview(preview.to_image())

    def get_image_size(self):
        image = (next(iter(self)))[0]
        return image.width, image.height

class IChunkWriter(ABC):
    def __init__(self, quality):
        self._image_quality = quality

    @staticmethod
    def _compress_image(image_path, quality):
        image = image_path.to_image() if isinstance(image_path, av.VideoFrame) else Image.open(image_path)
        # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
        if image.mode == "I":
            # Image mode is 32bit integer pixels.
            # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
            im_data = np.array(image)
            im_data = im_data * (2**8 / im_data.max())
            image = Image.fromarray(im_data.astype(np.int32))
        converted_image = image.convert('RGB')
        image.close()
        buf = io.BytesIO()
        converted_image.save(buf, format='JPEG', quality=quality, optimize=True)
        buf.seek(0)
        width, height = converted_image.size
        converted_image.close()
        return width, height, buf

    @abstractmethod
    def save_as_chunk(self, images, chunk_path):
        pass

class ZipChunkWriter(IChunkWriter):
    def save_as_chunk(self, images, chunk_path):
        with zipfile.ZipFile(chunk_path, 'x') as zip_chunk:
            for idx, (image, path, _) in enumerate(images):
                arcname = '{:06d}{}'.format(idx, os.path.splitext(path)[1])
                if isinstance(image, io.BytesIO):
                    zip_chunk.writestr(arcname, image.getvalue())
                else:
                    zip_chunk.write(filename=image, arcname=arcname)
        # return empty list because ZipChunkWriter write files as is
        # and does not decode it to know img size.
        return []

class ZipCompressedChunkWriter(IChunkWriter):
    def save_as_chunk(self, images, chunk_path):
        image_sizes = []
        with zipfile.ZipFile(chunk_path, 'x') as zip_chunk:
            for idx, (image, _ , _) in enumerate(images):
                w, h, image_buf = self._compress_image(image, self._image_quality)
                image_sizes.append((w, h))
                arcname = '{:06d}.jpeg'.format(idx)
                zip_chunk.writestr(arcname, image_buf.getvalue())

        return image_sizes

class Mpeg4ChunkWriter(IChunkWriter):
    def __init__(self, _):
        super().__init__(17)
        self._output_fps = 25

    @staticmethod
    def _create_av_container(path, w, h, rate, options):
            # x264 requires width and height must be divisible by 2 for yuv420p
            if h % 2:
                h += 1
            if w % 2:
                w += 1

            container = av.open(path, 'w')
            video_stream = container.add_stream('libx264', rate=rate)
            video_stream.pix_fmt = "yuv420p"
            video_stream.width = w
            video_stream.height = h
            video_stream.options = options

            return container, video_stream

    def save_as_chunk(self, images, chunk_path):
        if not images:
            raise Exception('no images to save')

        input_w = images[0][0].width
        input_h = images[0][0].height

        output_container, output_v_stream = self._create_av_container(
            path=chunk_path,
            w=input_w,
            h=input_h,
            rate=self._output_fps,
            options={
                "crf": str(self._image_quality),
                "preset": "ultrafast",
            },
        )

        self._encode_images(images, output_container, output_v_stream)
        output_container.close()
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
        # translate inversed range [1:100] to [0:51]
        self._image_quality = round(51 * (100 - quality) / 99)
        self._output_fps = 25


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

        output_container, output_v_stream = self._create_av_container(
            path=chunk_path,
            w=output_w,
            h=output_h,
            rate=self._output_fps,
            options={
                'profile': 'baseline',
                'coder': '0',
                'crf': str(self._image_quality),
                'wpredp': '0',
                'flags': '-loop'
            },
        )

        self._encode_images(images, output_container, output_v_stream)
        output_container.close()
        return [(input_w, input_h)]

def _is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'gzip', 'bzip2']
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
#           False - this media types can be combined with other which have unique == False

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
