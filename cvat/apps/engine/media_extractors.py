import os
import tempfile
import shutil
import zipfile
from io import BytesIO
import itertools
from abc import ABC, abstractmethod

import av
import av.datasets
import numpy as np
from pyunpack import Archive
from PIL import Image
import mimetypes

from cvat.apps.engine.models import DataChoice

_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
MEDIA_MIMETYPES_FILES = [
    os.path.join(_SCRIPT_DIR, "media.mimetypes"),
]
mimetypes.init(files=MEDIA_MIMETYPES_FILES)

def get_mime(name):
    for type_name, type_def in MEDIA_TYPES.items():
        if type_def['has_mime_type'](name):
            return type_name

    return 'unknown'

class IMediaReader(ABC):
    def __init__(self, source_path, step, start, stop):
        self._source_path = sorted(source_path)
        self._step = step
        self._start = start
        self._stop = stop

    @staticmethod
    def create_tmp_dir():
        return tempfile.mkdtemp(prefix='cvat-', suffix='.data')

    @staticmethod
    def delete_tmp_dir(tmp_dir):
        if tmp_dir:
            shutil.rmtree(tmp_dir)

    @abstractmethod
    def __iter__(self):
        pass

    @abstractmethod
    def __getitem__(self, k):
        pass

    # @abstractmethod
    # def get_preview(self):
    #     pass

    def slice_by_size(self, size):
        it = itertools.islice(self, self._start, self._stop if self._stop else None)
        frames = list(itertools.islice(it, 0, size * self._step, self._step))
        while frames:
            yield frames
            frames = list(itertools.islice(it, 0, size * self._step, self._step))

    @abstractmethod
    def get_image_names(self):
        pass

class IChunkWriter(ABC):
    def __init__(self, quality):
        self._image_quality = quality

    @staticmethod
    def _compress_image(image_path, quality):
        image = Image.open(image_path)
        # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
        if image.mode == "I":
            # Image mode is 32bit integer pixels.
            # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
            im_data = np.array(image)
            im_data = im_data * (2**8 / im_data.max())
            image = Image.fromarray(im_data.astype(np.int32))
        converted_image = image.convert('RGB')
        image.close()
        buf = BytesIO()
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
            for idx, image_file in enumerate(images):
                arcname = '{:06d}.{}'.format(idx, os.path.basename(image_file)[1])
                zip_chunk.write(filename=image_file, arcname=arcname)

        return []

class ZipCompressedChunkWriter(IChunkWriter):
    def save_as_chunk(self, images, chunk_path):
        image_sizes = []
        with zipfile.ZipFile(chunk_path, 'x') as zip_chunk:
            for idx, image_file in enumerate(images):
                w, h, image_buf = self._compress_image(image_file, self._image_quality)
                image_sizes.append((w, h))
                arcname = '{:06d}.jpeg'.format(idx)
                zip_chunk.writestr(arcname, image_buf.getvalue())

        return image_sizes

class Mpeg4ChunkWriter(IChunkWriter):
    def __init__(self, _):
        super().__init__(17)
        self._output_fps = 25

    @staticmethod
    def _create_av_container(path, w, h, rate, pix_format, options):
            container = av.open(path, 'w')
            video_stream = container.add_stream('libx264', rate=rate)
            video_stream.pix_fmt = pix_format
            video_stream.width = w
            video_stream.height = h
            video_stream.options = options

            return container, video_stream

    def save_as_chunk(self, images, chunk_path):
        if not images:
            raise Exception('no images to save')
        # frame_count = 0

        input_w = images[0].width
        input_h = images[0].height

        # idx = 0
        output_container, output_v_stream = self._create_av_container(
            path=chunk_path,
            w=input_w,
            h=input_h,
            rate=self._output_fps,
            pix_format='yuv420p',
            options={
                "crf": "15",
                "preset": "ultrafast",
            },
        )

        self._encode_images(images, output_container, output_v_stream)
        return [(input_w, input_h)]

    @staticmethod
    def _encode_images(images, container, stream):
        for frame in images:
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
        # frame_count = 0

        input_w = images[0].width
        input_h = images[0].height

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
            pix_format='yuv420p',
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

#Note step, start, stop have no affect
class ImageListReader(IMediaReader):
    def __init__(self, source_path, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No image found')
        super().__init__(
            source_path=source_path,
            step=1,
            start=0,
            stop=0,
        )

    def __iter__(self):
        return zip(self._source_path, self.get_image_names())

    def __getitem__(self, k):
        return self._source_path[k]

    def __len__(self):
        return len(self._source_path)

    def save_as_chunks(self, chunk_size, compressed_chunk_path, original_chunk_path, compressed_chunk_type,
            original_chunk_type, progress_callback=None, quality=100):
        counter = 0
        image_sizes = []
        total_length = len(self._source_path)
        for i in range(0, total_length, chunk_size):
            chunk_data = self._source_path[i:i + chunk_size]
            compressed_chunk = compressed_chunk_path(counter)
            with zipfile.ZipFile(compressed_chunk, 'x') as zip_chunk:
                for idx, image_file in enumerate(chunk_data):
                    w, h, image_buf = self.compress_image(image_file, quality)
                    image_sizes.append((w, h))
                    arcname = '{:06d}.jpeg'.format(idx)
                    zip_chunk.writestr(arcname, image_buf.getvalue())

            original_chunk = original_chunk_path(counter)
            with zipfile.ZipFile(original_chunk, 'x') as zip_chunk:
                for idx, image_file in enumerate(chunk_data):
                    arcname = '{:06d}.{}'.format(idx, os.path.basename(image_file)[1])
                    zip_chunk.write(filename=image_file, arcname=arcname)

            counter += 1
            if progress_callback:
                progress_callback(i / total_length)
        meta = [{'name': name, 'size': size} for name, size in zip(self.get_image_names(), image_sizes)]
        return meta, total_length

    def save_preview(self, preview_path):
        shutil.copyfile(self._source_path[0], preview_path)

    def get_image_names(self):
        return self._source_path

#Note step, start, stop have no affect
class DirectoryReader(ImageListReader):
    def __init__(self, source_path, step=1, start=0, stop=0):
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        super().__init__(
            source_path=image_paths,
            step=1,
            start=0,
            stop=0,
        )

#Note step, start, stop have no affect
class ArchiveReader(DirectoryReader):
    def __init__(self, source_path, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        self._archive_source = source_path[0]
        Archive(self._archive_source).extractall(self._tmp_dir)
        super().__init__(
            source_path=[self._tmp_dir],
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

    def get_image_names(self):
        return [os.path.join(os.path.dirname(self._archive_source), os.path.relpath(p, self._tmp_dir)) for p in super().get_image_names()]

#Note step, start, stop have no affect
class PdfReader(DirectoryReader):
    def __init__(self, source_path, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No PDF found')

        from pdf2image import convert_from_path
        self._pdf_source = source_path[0]
        self._tmp_dir = self.create_tmp_dir()
        file_ = convert_from_path(self._pdf_source)
        basename = os.path.splitext(os.path.basename(self._pdf_source))[0]
        for page_num, page in enumerate(file_):
            output = os.path.join(self._tmp_dir, '{}{:09d}.jpeg'.format(basename, page_num))
            page.save(output, 'JPEG')

        super().__init__(
            source_path=[self._tmp_dir],
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

    def get_image_names(self):
        return  [os.path.join(os.path.dirname(self._pdf_source), os.path.relpath(p, self._tmp_dir)) for p in super().get_image_names()]

class VideoReader(IMediaReader):
    def __init__(self, source_path, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        self._imagename_pattern = {
            'cmd': '%09d.tiff',
            'py': '{:09d}.tiff'
        }
        self._output_fps = 25

        super().__init__(
            source_path=source_path,
            step=step,
            start=start,
            stop=stop,
        )

    def __iter__(self):
        def decode_frames(container):
            for packet in container.demux():
                if packet.stream.type == 'video':
                    for frame in packet.decode():
                        yield frame

        container = self._get_av_container()
        source_video_stream = container.streams.video[0]
        source_video_stream.thread_type = 'AUTO'
        image_names = self.get_image_names()

        return itertools.zip_longest(decode_frames(container), image_names, fillvalue=image_names[0])

    def __len__(self):
        container = self._get_av_container()
        # Not for all containers return real value
        length = container.streams.video[0].frames
        container.close()
        return length

    def __getitem__(self, k):
        return next(itertools.islice(self, k, None))

    def _get_av_container(self):
        return av.open(av.datasets.curated(self._source_path[0]))

    def save_as_chunks(self, chunk_size, compressed_chunk_path, original_chunk_path, compressed_chunk_type,
            original_chunk_type, progress_callback=None, quality=100):
        if not self._source_path:
            raise Exception('No data to compress')

        # translate inversed range [1:100] to [0:51]
        translated_quality = round(51 * (100 - quality) / 99)

        container = self._get_av_container()
        source_video_stream = container.streams.video[0]
        source_video_stream.thread_type = 'AUTO'

        def decode_frames(container):
            for packet in container.demux():
                if packet.stream.type == 'video':
                    for frame in packet.decode():
                        yield frame

        def generate_chunks(container, count):
            it = itertools.islice(decode_frames(container), self._start, self._stop if self._stop else None)
            frames = list(itertools.islice(it, 0, count * self._step, self._step))
            while frames:
                yield frames
                frames = list(itertools.islice(it, 0, count * self._step, self._step))

        def create_av_container(path, w, h, rate, pix_format, options):
            container = av.open(path, 'w')
            video_stream = container.add_stream('libx264', rate=rate)
            video_stream.pix_fmt = pix_format
            video_stream.width = w
            video_stream.height = h
            video_stream.options = options

            return container, video_stream

        frame_count = 0
        downscale_factor = 1
        while source_video_stream.height / downscale_factor >= 1080:
            downscale_factor *= 2

        output_h = source_video_stream.height // downscale_factor
        output_w = source_video_stream.width // downscale_factor

        idx = 0
        for chunk_idx, frames in enumerate(generate_chunks(container, chunk_size)):
            if compressed_chunk_type == DataChoice.VIDEO:
                output_compressed_container, output_compressed_v_stream = create_av_container(
                    path=compressed_chunk_path(chunk_idx),
                    w=output_w,
                    h=output_h,
                    rate=self._output_fps,
                    pix_format='yuv420p',
                    options={
                        'profile': 'baseline',
                        'coder': '0',
                        'crf': str(translated_quality),
                        'wpredp': '0',
                        'flags': '-loop'
                    },
                )
            else:
                output_compressed_container = zipfile.ZipFile(compressed_chunk_path(chunk_idx), 'w')


            output_original_container, output_original_v_stream = create_av_container(
                path=original_chunk_path(chunk_idx),
                w=output_w,
                h=output_h,
                rate=self._output_fps,
                pix_format='yuv420p',
                options={
                    "crf": "15",
                    "preset": "ultrafast",
                },
            )

            for frame in frames:
                # let libav set the correct pts and time_base
                frame.pts = None
                frame.time_base = None
                if compressed_chunk_type == DataChoice.VIDEO:
                    for packet in output_compressed_v_stream.encode(frame):
                        output_compressed_container.mux(packet)
                else:
                    buf = BytesIO()
                    img = frame.to_image()
                    img.save(buf, format='JPEG', quality=quality, optimize=True)
                    buf.seek(0)
                    arcname = '{:06d}.jpeg'.format(idx)
                    output_compressed_container.writestr(arcname, buf.getvalue())

                for packet in output_original_v_stream.encode(frame):
                    output_original_container.mux(packet)
                idx += 1

            # Flush streams
            if compressed_chunk_type == DataChoice.VIDEO:
                for packet in output_compressed_v_stream.encode():
                    output_compressed_container.mux(packet)
            output_compressed_container.close()

            for packet in output_original_v_stream.encode():
                output_original_container.mux(packet)
            output_original_container.close()

            frame_count += len(frames)

            if progress_callback and container.streams.video[0].frames:
                progress_callback(chunk_idx * chunk_size / container.streams.video[0].frames)

        return [{'name': self._source_path[0], 'size': (source_video_stream.width, source_video_stream.height)}], frame_count

    def save_preview(self, preview_path):
        container = self._get_av_container()
        stream = container.streams.video[0]
        preview = next(container.decode(stream))
        preview.to_image().save(preview_path)

    def get_image_names(self):
        return self._source_path

def _is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/zip', 'application/x-rar-compressed',
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
}
