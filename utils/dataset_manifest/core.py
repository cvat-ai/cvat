# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import av
import json
import marshal
import os
from abc import ABC, abstractmethod
from collections import OrderedDict
from PIL import Image
from .utils import md5_hash, rotate_image

class WorkWithVideo:
    def __init__(self, **kwargs):
        if not kwargs.get('source_path'):
            raise Exception('No sourse path')
        self.source_path = kwargs.get('source_path')

    @staticmethod
    def _open_video_container(sourse_path, mode, options=None):
        return av.open(sourse_path, mode=mode, options=options)

    @staticmethod
    def _close_video_container(container):
        container.close()

    @staticmethod
    def _get_video_stream(container):
        video_stream = next(stream for stream in container.streams if stream.type == 'video')
        video_stream.thread_type = 'AUTO'
        return video_stream

    @staticmethod
    def _get_frame_size(container):
        video_stream = WorkWithVideo._get_video_stream(container)
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if video_stream.metadata.get('rotate'):
                    frame = av.VideoFrame().from_ndarray(
                        rotate_image(
                            frame.to_ndarray(format='bgr24'),
                            360 - int(container.streams.video[0].metadata.get('rotate')),
                        ),
                        format ='bgr24',
                    )
                return frame.width, frame.height

class AnalyzeVideo(WorkWithVideo):
    def check_type_first_frame(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        for packet in container.demux(video_stream):
            for frame in packet.decode():
                self._close_video_container(container)
                assert frame.pict_type.name == 'I', 'First frame is not key frame'
                return

    def check_video_timestamps_sequences(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        frame_pts = -1
        frame_dts = -1
        for packet in container.demux(video_stream):
            for frame in packet.decode():

                if None not in [frame.pts, frame_pts] and frame.pts <= frame_pts:
                    self._close_video_container(container)
                    raise Exception('Invalid pts sequences')

                if None not in [frame.dts, frame_dts] and frame.dts <= frame_dts:
                    self._close_video_container(container)
                    raise Exception('Invalid dts sequences')

                frame_pts, frame_dts = frame.pts, frame.dts
        self._close_video_container(container)

class IPrepareInfo:
    def __init__(self, sources, is_sorted=True, *args, **kwargs):
        self._sources = sources if is_sorted else sorted(sources)
        self._content = []
        self._data_dir = kwargs.get('data_dir', None)

    def __iter__(self):
        for image in self._sources:
            img = Image.open(image, mode='r')
            img_name = os.path.relpath(image, self._data_dir) if self._data_dir else os.path.basename(image)
            yield (img_name, img.width, img.height, md5_hash(img))

    def create(self):
        for item in self:
            self._content.append(item)

    @property
    def content(self):
        return self._content

class VPrepareInfo(WorkWithVideo):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._key_frames = OrderedDict()
        self.frames = 0

        container = self._open_video_container(self.source_path, 'r')
        self.width, self.height = self._get_frame_size(container)
        self._close_video_container(container)

    def get_task_size(self):
        return self.frames

    @property
    def frame_sizes(self):
        return (self.width, self.height)

    def validate_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if md5_hash(frame) != key_frame[1]['md5'] or frame.pts != key_frame[1]['pts']:
                    self._key_frames.pop(key_frame[0])
                return

    def validate_seek_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        key_frames_copy = self._key_frames.copy()

        for key_frame in key_frames_copy.items():
            container.seek(offset=key_frame[1]['pts'], stream=video_stream)
            self.validate_key_frame(container, video_stream, key_frame)

    def validate_frames_ratio(self, chunk_size):
        return (len(self._key_frames) and (self.frames // len(self._key_frames)) <= 2 * chunk_size)

    def save_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        frame_number = 0

        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if frame.key_frame:
                    self._key_frames[frame_number] = {
                        'pts': frame.pts,
                        'md5': md5_hash(frame),
                    }
                frame_number += 1

        self.frames = frame_number
        self._close_video_container(container)

    @property
    def key_frames(self):
        return self._key_frames

    def __len__(self):
        return len(self._key_frames)

    def __iter__(self):
        for idx, key_frame in self._key_frames.items():
            yield (idx, key_frame['pts'], key_frame['md5'])

def _prepare_video_meta(media_file, upload_dir=None, chunk_size=None):
    source_path = os.path.join(upload_dir, media_file) if upload_dir else media_file
    analyzer = AnalyzeVideo(source_path=source_path)
    analyzer.check_type_first_frame()
    analyzer.check_video_timestamps_sequences()

    meta_info = VPrepareInfo(source_path=source_path)
    meta_info.save_key_frames()
    meta_info.validate_seek_key_frames()
    smooth_decoding = meta_info.validate_frames_ratio(chunk_size) if chunk_size else None
    return (meta_info, smooth_decoding)

def _prepare_images_meta(sources, **kwargs):
    meta_info = IPrepareInfo(sources=sources, **kwargs)
    meta_info.create()
    return meta_info

def prepare_meta(data_type, **kwargs):
    assert data_type in ('video', 'images'), 'prepare_meta: Unknown data type'
    actions = {
        'video': _prepare_video_meta,
        'images': _prepare_images_meta,
    }
    return actions[data_type](**kwargs)

class _Manifest:
    FILE_NAME = 'manifest.jsonl'
    VERSION = '1.0'

    def __init__(self, path, is_created=False):
        assert path, 'A path to manifest file not found'
        self._path = os.path.join(path, self.FILE_NAME) if os.path.isdir(path) else path
        self._is_created = is_created

    @property
    def path(self):
        return self._path

    @property
    def is_created(self):
        return self._is_created

    @is_created.setter
    def is_created(self, value):
        assert isinstance(value, bool)
        self._is_created = value

# Needed for faster iteration over the manifest file, will be generated to work inside CVAT
# and will not be generated when manually creating a manifest
class _Index:
    FILE_NAME = 'index'

    def __init__(self, path):
        assert path and os.path.isdir(path), 'No index directory path'
        self._path = os.path.join(path, self.FILE_NAME)
        self._index = {}

    @property
    def path(self):
        return self._path

    def dump(self):
        with open(self._path, 'wb') as index_file:
            marshal.dump(self._index, index_file, 4)

    def load(self):
        with open(self._path, 'rb') as index_file:
            self._index = marshal.load(index_file)

    def create(self, manifest, skip):
        assert os.path.exists(manifest), 'A manifest file not exists, index cannot be created'
        with open(manifest, 'r+') as manifest_file:
            while skip:
                manifest_file.readline()
                skip -= 1
            image_number = 0
            self._index[image_number] = manifest_file.tell()
            line = manifest_file.readline()
            while line:
                if line.strip():
                    image_number += 1
                    self._index[image_number] = manifest_file.tell()
                line = manifest_file.readline()

    def partial_update(self, manifest, number):
        with open(manifest, 'r+') as manifest_file:
            manifest_file.seek(self._index[number])
            line = manifest_file.readline()
            while line:
                if line.strip():
                    self._index[number] = manifest_file.tell()
                    number += 1
                line = manifest_file.readline()

    def __getitem__(self, number):
        assert 0 <= number < len(self), 'A invalid index number'
        return self._index[number]

    def __len__(self):
        return len(self._index)

class _ManifestManager(ABC):
    BASE_INFORMATION = {
        'version' : 1,
        'type': 2,
    }
    def __init__(self, path, *args, **kwargs):
        self._manifest = _Manifest(path)

    def _parse_line(self, line):
        """ Getting a random line from the manifest file """
        with open(self._manifest.path, 'r') as manifest_file:
            if isinstance(line, str):
                assert line in self.BASE_INFORMATION.keys()
                for _ in range(self.BASE_INFORMATION[line]):
                    fline = manifest_file.readline()
                return json.loads(fline)[line]
            else:
                assert self._index, 'No prepared index'
                offset = self._index[line]
                manifest_file.seek(offset)
                properties = manifest_file.readline()
                return json.loads(properties)

    def init_index(self):
        self._index = _Index(os.path.dirname(self._manifest.path))
        if os.path.exists(self._index.path):
            self._index.load()
        else:
            self._index.create(self._manifest.path, 3 if self._manifest.TYPE == 'video' else 2)
            self._index.dump()

    @abstractmethod
    def create(self, content, **kwargs):
        pass

    @abstractmethod
    def partial_update(self, number, properties):
        pass

    def __iter__(self):
        with open(self._manifest.path, 'r') as manifest_file:
            manifest_file.seek(self._index[0])
            image_number = 0
            line = manifest_file.readline()
            while line:
                if not line.strip():
                    continue
                yield (image_number, json.loads(line))
                image_number += 1
                line = manifest_file.readline()

    @property
    def manifest(self):
        return self._manifest

    def __len__(self):
        if hasattr(self, '_index'):
            return len(self._index)
        else:
            return None

    def __getitem__(self, item):
        return self._parse_line(item)

    @property
    def index(self):
        return self._index

class VManifestManager(_ManifestManager):
    def __init__(self, manifest_path, *args, **kwargs):
        super().__init__(manifest_path)
        setattr(self._manifest, 'TYPE', 'video')
        self.BASE_INFORMATION['properties'] = 3

    def create(self, content, **kwargs):
        """ Creating and saving a manifest file """
        with open(self._manifest.path, 'w') as manifest_file:
            manifest_file.write(f"{json.dumps({'version':self._manifest.VERSION})}\n")
            manifest_file.write(f"{json.dumps({'type':self._manifest.TYPE})}\n")
            manifest_file.write(f"{json.dumps({'properties':{'name':os.path.basename(content.source_path),'resolution': content.frame_sizes, 'length': content.get_task_size()}})}\n")
            for item in content:
                json_item = json.dumps({'number': item[0], 'pts': item[1], 'checksum': item[2]}, separators=(',', ':'))
                manifest_file.write(f"{json_item}\n")
        self._manifest.is_created = True

    def partial_update(self, number, properties):
        """ Updating a part of a manifest file """
        pass

#TODO:
class ManifestValidator:
    def validate_base_info(self):
        with open(self._manifest.path, 'r') as manifest_file:
            assert self._manifest.VERSION != json.loads(manifest_file.readline())['version']
            assert self._manifest.TYPE != json.loads(manifest_file.readline())['type']

class VManifestValidator(VManifestManager, WorkWithVideo):
    def __init__(self, **kwargs):
        WorkWithVideo.__init__(self, **kwargs)
        VManifestManager.__init__(self, **kwargs)

    def validate_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                assert frame.pts == key_frame['pts'], "The uploaded manifest does not match the video"
                return

    def validate_seek_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        last_key_frame = None

        for _, key_frame in self:
            # check that key frames sequence sorted
            if last_key_frame and last_key_frame['number'] >= key_frame['number']:
                raise AssertionError('Invalid saved key frames sequence in manifest file')
            container.seek(offset=key_frame['pts'], stream=video_stream)
            self.validate_key_frame(container, video_stream, key_frame)
            last_key_frame = key_frame

        self._close_video_container(container)

    def validate_frames_numbers(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        # not all videos contain information about numbers of frames
        frames = video_stream.frames
        if frames:
            self._close_video_container(container)
            assert frames == self['properties']['length'], "The uploaded manifest does not match the video"
            return
        self._close_video_container(container)

class IManifestManager(_ManifestManager):
    def __init__(self, manifest_path):
        super().__init__(manifest_path)
        setattr(self._manifest, 'TYPE', 'images')

    def create(self, content, **kwargs):
        """ Creating and saving a manifest file"""
        with open(self._manifest.path, 'w') as manifest_file:
            manifest_file.write(f"{json.dumps({'version': self._manifest.VERSION})}\n")
            manifest_file.write(f"{json.dumps({'type': self._manifest.TYPE})}\n")

            for item in content:
                name, ext = os.path.splitext(item[0])
                json_item = json.dumps({'name': name, 'extension': ext,
                    'width': item[1], 'height': item[2],
                    'checksum': item[3]}, separators=(',', ':'))
                manifest_file.write(f"{json_item}\n")
        self._manifest.is_created = True

    def partial_update(self, number, properties):
        """ Updating a part of a manifest file """
        pass