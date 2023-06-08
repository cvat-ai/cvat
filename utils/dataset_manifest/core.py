# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from io import StringIO
import av
import json
import os

from abc import ABC, abstractmethod, abstractproperty, abstractstaticmethod
from contextlib import closing
from PIL import Image
from json.decoder import JSONDecodeError
from io import BytesIO

from .errors import InvalidManifestError, InvalidVideoFrameError
from .utils import SortingMethod, md5_hash, rotate_image, sort

from typing import Dict, List, Union, Optional

class VideoStreamReader:
    def __init__(self, source_path, chunk_size, force):
        self._source_path = source_path
        self._frames_number = None
        self._force = force
        self._upper_bound = 3 * chunk_size + 1

        with closing(av.open(self.source_path, mode='r')) as container:
            video_stream = VideoStreamReader._get_video_stream(container)
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    # check type of first frame
                    if not frame.pict_type.name == 'I':
                        raise InvalidVideoFrameError('First frame is not key frame')

                    # get video resolution
                    if video_stream.metadata.get('rotate'):
                        frame = av.VideoFrame().from_ndarray(
                            rotate_image(
                                frame.to_ndarray(format='bgr24'),
                                360 - int(container.streams.video[0].metadata.get('rotate')),
                            ),
                            format ='bgr24',
                        )
                    self.height, self.width = (frame.height, frame.width)

                    # not all videos contain information about numbers of frames
                    if video_stream.frames:
                        self._frames_number = video_stream.frames

                    return

    @property
    def source_path(self):
        return self._source_path

    @staticmethod
    def _get_video_stream(container):
        video_stream = next(stream for stream in container.streams if stream.type == 'video')
        video_stream.thread_type = 'AUTO'
        return video_stream

    def __len__(self):
        return self._frames_number

    @property
    def resolution(self):
        return (self.width, self.height)

    def validate_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if md5_hash(frame) != key_frame['md5'] or frame.pts != key_frame['pts']:
                    return False
                return True

    def __iter__(self):
        with closing(av.open(self.source_path, mode='r')) as container:
            video_stream = self._get_video_stream(container)
            frame_pts, frame_dts = -1, -1
            index, key_frame_number = 0, 0
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    if None not in {frame.pts, frame_pts} and frame.pts <= frame_pts:
                        raise InvalidVideoFrameError('Invalid pts sequences')
                    if None not in {frame.dts, frame_dts} and frame.dts <= frame_dts:
                        raise InvalidVideoFrameError('Invalid dts sequences')
                    frame_pts, frame_dts = frame.pts, frame.dts

                    if frame.key_frame:
                        key_frame_number += 1
                        ratio = (index + 1) // key_frame_number

                        if ratio >= self._upper_bound and not self._force:
                            raise AssertionError('Too few keyframes')

                        key_frame = {
                            'index': index,
                            'pts': frame.pts,
                            'md5': md5_hash(frame)
                        }

                        with closing(av.open(self.source_path, mode='r')) as checked_container:
                            checked_container.seek(offset=key_frame['pts'], stream=video_stream)
                            isValid = self.validate_key_frame(checked_container, video_stream, key_frame)
                            if isValid:
                                yield (index, key_frame['pts'], key_frame['md5'])
                    else:
                        yield index
                    index += 1
            if not self._frames_number:
                self._frames_number = index

class KeyFramesVideoStreamReader(VideoStreamReader):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __iter__(self):
        with closing(av.open(self.source_path, mode='r')) as container:
            video_stream = self._get_video_stream(container)
            frame_pts, frame_dts = -1, -1
            index, key_frame_number = 0, 0
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    if None not in {frame.pts, frame_pts} and frame.pts <= frame_pts:
                        raise InvalidVideoFrameError('Invalid pts sequences')
                    if None not in {frame.dts, frame_dts} and frame.dts <= frame_dts:
                        raise InvalidVideoFrameError('Invalid dts sequences')
                    frame_pts, frame_dts = frame.pts, frame.dts

                    if frame.key_frame:
                        key_frame_number += 1
                        ratio = (index + 1) // key_frame_number
                        if ratio >= self._upper_bound and not self._force:
                            raise AssertionError('Too few keyframes')
                        key_frame = {
                            'index': index,
                            'pts': frame.pts,
                            'md5': md5_hash(frame)
                        }

                        with closing(av.open(self.source_path, mode='r')) as checked_container:
                            checked_container.seek(offset=key_frame['pts'], stream=video_stream)
                            isValid = self.validate_key_frame(checked_container, video_stream, key_frame)
                            if isValid:
                                yield (index, key_frame['pts'], key_frame['md5'])
                    index += 1

class DatasetImagesReader:
    def __init__(self,
                sources: Union[List[str], List[BytesIO]],
                *,
                start: int = 0,
                step: int = 1,
                stop: Optional[int] = None,
                meta: Optional[Dict[str, List[str]]] = None,
                sorting_method: SortingMethod =SortingMethod.PREDEFINED,
                use_image_hash: bool = False,
                **kwargs):
        self._raw_data_used = not isinstance(sources[0], str)
        func = (lambda x: x.filename) if self._raw_data_used else None
        self._sources = sort(sources, sorting_method, func=func)
        self._meta = meta
        self._data_dir = kwargs.get('data_dir', None)
        self._use_image_hash = use_image_hash
        self._start = start
        self._stop = stop if stop else len(sources)
        self._step = step

    @property
    def start(self):
        return self._start

    @start.setter
    def start(self, value):
        self._start = int(value)

    @property
    def stop(self):
        return self._stop

    @stop.setter
    def stop(self, value):
        self._stop = int(value)

    @property
    def step(self):
        return self._step

    @step.setter
    def step(self, value):
        self._step = int(value)

    def __iter__(self):
        sources = (i for i in self._sources)
        for idx in range(self._stop):
            if idx in self.range_:
                image = next(sources)
                img = Image.open(image, mode='r')

                img_name = os.path.relpath(image, self._data_dir) if self._data_dir \
                    else os.path.basename(image) if not self._raw_data_used else image.filename
                name, extension = os.path.splitext(img_name)
                image_properties = {
                    'name': name.replace('\\', '/'),
                    'extension': extension,
                }

                width, height = img.width, img.height
                orientation = img.getexif().get(274, 1)
                if orientation > 4:
                    width, height = height, width
                image_properties['width'] = width
                image_properties['height'] = height

                if self._meta and img_name in self._meta:
                    image_properties['meta'] = self._meta[img_name]

                if self._use_image_hash:
                    image_properties['checksum'] = md5_hash(img)

                yield image_properties
            else:
                yield dict()

    @property
    def range_(self):
        return range(self._start, self._stop, self._step)

    def __len__(self):
        return len(self.range_)

class Dataset3DImagesReader(DatasetImagesReader):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __iter__(self):
        sources = (i for i in self._sources)
        for idx in range(self._stop):
            if idx in self.range_:
                image = next(sources)
                img_name = os.path.relpath(image, self._data_dir) if self._data_dir \
                    else os.path.basename(image)
                name, extension = os.path.splitext(img_name)
                image_properties = {
                    'name': name,
                    'extension': extension,
                }
                if self._meta and img_name in self._meta:
                    image_properties['meta'] = self._meta[img_name]
                yield image_properties
            else:
                yield dict()

class _Manifest:
    class SupportedVersion(str, Enum):
        V1 = '1.0'
        V1_1 = '1.1'

        @classmethod
        def choices(cls):
            return (x.value for x in cls)

        def __str__(self):
            return self.value

    FILE_NAME = 'manifest.jsonl'
    VERSION = SupportedVersion.V1_1
    TYPE: str  # must be set externally

    def __init__(self, path, upload_dir=None):
        assert path, 'A path to manifest file not found'
        self._path = os.path.join(path, self.FILE_NAME) if os.path.isdir(path) else path
        self._upload_dir = upload_dir

    @property
    def path(self):
        return self._path

    @property
    def name(self):
        return os.path.basename(self._path) if not self._upload_dir \
            else os.path.relpath(self._path, self._upload_dir)

    def get_header_lines_count(self) -> int:
        if self.TYPE == 'video':
            return 3
        elif self.TYPE == 'images':
            return 2
        assert False, f"Unknown manifest type '{self.TYPE}'"

# Needed for faster iteration over the manifest file, will be generated to work inside CVAT
# and will not be generated when manually creating a manifest
class _Index:
    FILE_NAME = 'index.json'

    def __init__(self, path):
        assert path and os.path.isdir(path), 'No index directory path'
        self._path = os.path.join(path, self.FILE_NAME)
        self._index = {}

    @property
    def path(self):
        return self._path

    def dump(self):
        with open(self._path, 'w') as index_file:
            json.dump(self._index, index_file,  separators=(',', ':'))

    def load(self):
        with open(self._path, 'r') as index_file:
            self._index = json.load(index_file,
                object_hook=lambda d: {int(k): v for k, v in d.items()})

    def remove(self):
        os.remove(self._path)

    def create(self, manifest, *, skip):
        assert os.path.exists(manifest), 'A manifest file not exists, index cannot be created'
        with open(manifest, 'r+') as manifest_file:
            while skip:
                manifest_file.readline()
                skip -= 1
            image_number = 0
            position = manifest_file.tell()
            line = manifest_file.readline()
            while line:
                if line.strip():
                    self._index[image_number] = position
                    image_number += 1
                    position = manifest_file.tell()
                line = manifest_file.readline()

    def partial_update(self, manifest, number):
        assert os.path.exists(manifest), 'A manifest file not exists, index cannot be updated'
        with open(manifest, 'r+') as manifest_file:
            manifest_file.seek(self._index[number])
            line = manifest_file.readline()
            while line:
                if line.strip():
                    self._index[number] = manifest_file.tell()
                    number += 1
                line = manifest_file.readline()

    def __getitem__(self, number):
        if not 0 <= number < len(self):
            raise IndexError('Invalid index number: {}\nMax: {}'.format(number, len(self) - 1))

        return self._index[number]

    def __len__(self):
        return len(self._index)

class _ManifestManager(ABC):
    BASE_INFORMATION = {
        'version' : 1,
        'type': 2,
    }

    def _json_item_is_valid(self, **state):
        for item in self._required_item_attributes:
            if state.get(item, None) is None:
                raise InvalidManifestError(
                    f"Invalid '{self.manifest.name}' file structure: "
                    f"'{item}' is required, but not found"
                )

    def __init__(self, path, create_index, upload_dir=None):
        self._manifest = _Manifest(path, upload_dir)
        self._index = _Index(os.path.dirname(self._manifest.path))
        self._reader = None
        self._create_index = create_index

    @property
    def reader(self):
        return self._reader

    def _parse_line(self, line):
        """ Getting a random line from the manifest file """
        with open(self._manifest.path, 'r') as manifest_file:
            if isinstance(line, str):
                assert line in self.BASE_INFORMATION.keys(), \
                    'An attempt to get non-existent information from the manifest'
                for _ in range(self.BASE_INFORMATION[line]):
                    fline = manifest_file.readline()
                return json.loads(fline)[line]
            else:
                assert self._index, 'No prepared index'
                offset = self._index[line]
                manifest_file.seek(offset)
                properties = manifest_file.readline()
                parsed_properties = ImageProperties(json.loads(properties))
                self._json_item_is_valid(**parsed_properties)
                return parsed_properties

    def init_index(self):
        if os.path.exists(self._index.path):
            self._index.load()
        else:
            self._index.create(self._manifest.path, skip=self._manifest.get_header_lines_count())
            if self._create_index:
                self._index.dump()

    def reset_index(self):
        if self._create_index and os.path.exists(self._index.path):
            self._index.remove()

    def set_index(self):
        self.reset_index()
        self.init_index()

    def remove(self):
        self.reset_index()
        if os.path.exists(self.manifest.path):
            os.remove(self.manifest.path)

    @abstractmethod
    def create(self, content=None, _tqdm=None):
        ...

    @abstractmethod
    def partial_update(self, number, properties):
        ...

    def __iter__(self):
        self.set_index()

        with open(self._manifest.path, 'r') as manifest_file:
            manifest_file.seek(self._index[0])
            for idx, line_start in enumerate(self._index):
                manifest_file.seek(line_start)
                line = manifest_file.readline()
                item = ImageProperties(json.loads(line))
                self._json_item_is_valid(**item)
                yield (idx, item)

    @property
    def manifest(self):
        return self._manifest

    def __len__(self):
        if hasattr(self, '_index'):
            return len(self._index)
        else:
            return None

    def __getitem__(self, item):
        if isinstance(item, slice):
            return [self._parse_line(i) for i in range(item.start or 0, item.stop or len(self), item.step or 1)]
        return self._parse_line(item)

    @property
    def index(self):
        return self._index

    @abstractproperty
    def data(self):
        ...

    @abstractmethod
    def get_subset(self, subset_names):
        ...

    @property
    def exists(self):
        return os.path.exists(self._manifest.path)

class VideoManifestManager(_ManifestManager):
    _required_item_attributes = {'number', 'pts'}

    def __init__(self, manifest_path, create_index=True):
        super().__init__(manifest_path, create_index)
        setattr(self._manifest, 'TYPE', 'video')
        self.BASE_INFORMATION['properties'] = 3

    def link(self, media_file, upload_dir=None, chunk_size=36, force=False, only_key_frames=False, **kwargs):
        ReaderClass = VideoStreamReader if not only_key_frames else KeyFramesVideoStreamReader
        self._reader = ReaderClass(
            os.path.join(upload_dir, media_file) if upload_dir else media_file,
            chunk_size,
            force)

    def _write_base_information(self, file):
        base_info = {
            'version': self._manifest.VERSION,
            'type': self._manifest.TYPE,
            'properties': {
                'name': os.path.basename(self._reader.source_path),
                'resolution': self._reader.resolution,
                'length': len(self._reader),
            },
        }
        for key, value in base_info.items():
            json_item = json.dumps({key: value}, separators=(',', ':'))
            file.write(f'{json_item}\n')

    def _write_core_part(self, file, _tqdm):
        iterable_obj = self._reader if _tqdm is None else \
            _tqdm(self._reader, desc="Manifest creating", total=len(self._reader))
        for item in iterable_obj:
            if isinstance(item, tuple):
                json_item = json.dumps({
                    'number': item[0],
                    'pts': item[1],
                    'checksum': item[2]
                }, separators=(',', ':'))
                file.write(f"{json_item}\n")

    def create(self, *, _tqdm=None): # pylint: disable=arguments-differ
        """ Creating and saving a manifest file """
        if not len(self._reader):
            tmp_file = StringIO()
            self._write_core_part(tmp_file, _tqdm)

            with open(self._manifest.path, 'w') as manifest_file:
                self._write_base_information(manifest_file)
                manifest_file.write(tmp_file.getvalue())
        else:
            with open(self._manifest.path, 'w') as manifest_file:
                self._write_base_information(manifest_file)
                self._write_core_part(manifest_file, _tqdm)

        self.set_index()

    def partial_update(self, number, properties):
        pass

    @property
    def video_name(self):
        return self['properties']['name']

    @property
    def video_resolution(self):
        return self['properties']['resolution']

    @property
    def video_length(self):
        return self['properties']['length']

    @property
    def data(self):
        return self.video_name

    def get_subset(self, subset_names):
        raise NotImplementedError()

class VideoManifestValidator(VideoManifestManager):
    def __init__(self, source_path, manifest_path):
        self._source_path = source_path
        super().__init__(manifest_path)

    @staticmethod
    def _get_video_stream(container):
        video_stream = next(stream for stream in container.streams if stream.type == 'video')
        video_stream.thread_type = 'AUTO'
        return video_stream

    def validate_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                assert frame.pts == key_frame['pts'], "The uploaded manifest does not match the video"
                return

    def validate_seek_key_frames(self):
        with closing(av.open(self._source_path, mode='r')) as container:
            video_stream = self._get_video_stream(container)
            last_key_frame = None

            for _, key_frame in self:
                # check that key frames sequence sorted
                if last_key_frame and last_key_frame['number'] >= key_frame['number']:
                    raise AssertionError('Invalid saved key frames sequence in manifest file')
                container.seek(offset=key_frame['pts'], stream=video_stream)
                self.validate_key_frame(container, video_stream, key_frame)
                last_key_frame = key_frame

    def validate_frame_numbers(self):
        with closing(av.open(self._source_path, mode='r')) as container:
            video_stream = self._get_video_stream(container)
            # not all videos contain information about numbers of frames
            frames = video_stream.frames
            if frames:
                assert frames == self.video_length, "The uploaded manifest does not match the video"
                return

class ImageProperties(dict):
    @property
    def full_name(self):
        return f"{self['name']}{self['extension']}"

class ImageManifestManager(_ManifestManager):
    _required_item_attributes = {'name', 'extension'}

    def __init__(self, manifest_path, upload_dir=None, create_index=True):
        super().__init__(manifest_path, create_index, upload_dir)
        setattr(self._manifest, 'TYPE', 'images')

    def link(self, **kwargs):
        ReaderClass = DatasetImagesReader if not kwargs.get('DIM_3D', None) else Dataset3DImagesReader
        self._reader = ReaderClass(**kwargs)

    def _write_base_information(self, file):
        base_info = {
            'version': self._manifest.VERSION,
            'type': self._manifest.TYPE,
        }
        for key, value in base_info.items():
            json_line = json.dumps({key: value}, separators=(',', ':'))
            file.write(f'{json_line}\n')

    def _write_core_part(self, file, obj, _tqdm):
        iterable_obj = obj if _tqdm is None else \
            _tqdm(obj, desc="Manifest creating",
                  total=None if not hasattr(obj, '__len__') else len(obj))
        for image_properties in iterable_obj:
            json_line = json.dumps({
                key: value for key, value in image_properties.items()
            }, separators=(',', ':'))
            file.write(f"{json_line}\n")

    def create(self, content=None, _tqdm=None):
        """ Creating and saving a manifest file for the specialized dataset"""
        with open(self._manifest.path, 'w') as manifest_file:
            self._write_base_information(manifest_file)
            obj = content if content else self._reader
            self._write_core_part(manifest_file, obj, _tqdm)

        self.set_index()

    def partial_update(self, number, properties):
        pass

    @property
    def data(self):
        return (f"{image.full_name}" for _, image in self)

    def get_subset(self, subset_names):
        index_list = []
        subset = []
        for _, image in self:
            image_name = f"{image.full_name}"
            if image_name in subset_names:
                index_list.append(subset_names.index(image_name))
                properties = {
                    'name': f"{image['name']}",
                    'extension': f"{image['extension']}",
                    'width': image['width'],
                    'height': image['height'],
                }
                for optional_field in {'meta', 'checksum'}:
                    value = image.get(optional_field)
                    if value:
                        properties[optional_field] =  value
                subset.append(properties)
        return index_list, subset

    def emulate_hierarchical_structure(
        self,
        page_size: int,
        manifest_prefix: Optional[str] = None,
        prefix: Optional[str] = None,
        start_index: Optional[int] = None,
    ) -> Dict:

        next_start_index = None
        # get part of manifest content
        # generally we cannot rely to slice with manifest content because it may not be sorted.
        # And then this can lead to incorrect index calculation.
        if manifest_prefix:
            content = [os.path.join(manifest_prefix, f[1].full_name) for f in self]
        else:
            content = [f[1].full_name for f in self]

        if prefix:
            content = list(filter(lambda x: x.startswith(prefix), content))
            if os.path.sep in prefix:
                last_dir_symbol = prefix.rindex(os.path.sep)
                content = [f[last_dir_symbol + 1:] for f in content]

        files_in_root, files_in_directories = [], []

        for f in content:
            if os.path.sep in f:
                files_in_directories.append(f)
            else:
                files_in_root.append(f)

        directories = list(set([d.split(os.path.sep)[0] for d in files_in_directories]))
        level_in_hierarchical_structure = [{'name': d, 'type': 'DIR'} for d in sort(directories, SortingMethod.NATURAL)]
        level_in_hierarchical_structure.extend([{'name': f, 'type': 'REG'} for f in sort(files_in_root, SortingMethod.NATURAL)])

        level_in_hierarchical_structure = level_in_hierarchical_structure[start_index:]
        if len(level_in_hierarchical_structure) > page_size:
            level_in_hierarchical_structure = level_in_hierarchical_structure[:page_size]
            next_start_index = start_index + page_size

        return {
            'content': level_in_hierarchical_structure,
            'next': next_start_index,
        }

class _BaseManifestValidator(ABC):
    def __init__(self, full_manifest_path):
        self._manifest = _Manifest(full_manifest_path)

    def validate(self):
        try:
            # we cannot use index in general because manifest may be e.g. in share point with ro mode
            with open(self._manifest.path, 'r') as manifest:
                for validator in self.validators:
                    line = json.loads(manifest.readline().strip())
                    validator(line)
            return True
        except (ValueError, KeyError, JSONDecodeError, InvalidManifestError):
            return False

    @staticmethod
    def _validate_version(_dict):
        if not _dict['version'] in _Manifest.SupportedVersion.choices():
            raise InvalidManifestError('Incorrect version field')

    def _validate_type(self, _dict):
        if not _dict['type'] == self.TYPE:
            raise InvalidManifestError('Incorrect type field')

    @abstractproperty
    def validators(self):
        pass

    @abstractstaticmethod
    def _validate_first_item(_dict):
        pass

class _VideoManifestStructureValidator(_BaseManifestValidator):
    TYPE = 'video'

    @property
    def validators(self):
        return (
            self._validate_version,
            self._validate_type,
            self._validate_properties,
            self._validate_first_item,
        )

    @staticmethod
    def _validate_properties(_dict):
        properties = _dict['properties']
        if not isinstance(properties['name'], str):
            raise InvalidManifestError('Incorrect name field')
        if not isinstance(properties['resolution'], list):
            raise InvalidManifestError('Incorrect resolution field')
        if not isinstance(properties['length'], int) or properties['length'] == 0:
            raise InvalidManifestError('Incorrect length field')

    @staticmethod
    def _validate_first_item(_dict):
        if not isinstance(_dict['number'], int):
            raise InvalidManifestError('Incorrect number field')
        if not isinstance(_dict['pts'], int):
            raise InvalidManifestError('Incorrect pts field')

class _DatasetManifestStructureValidator(_BaseManifestValidator):
    TYPE = 'images'

    @property
    def validators(self):
        return (
            self._validate_version,
            self._validate_type,
            self._validate_first_item,
        )

    @staticmethod
    def _validate_first_item(_dict):
        if not isinstance(_dict['name'], str):
            raise InvalidManifestError('Incorrect name field')
        if not isinstance(_dict['extension'], str):
            raise InvalidManifestError('Incorrect extension field')
        # FIXME
        # Width and height are required for 2D data, but
        # for 3D these parameters are not saved now.
        # It is necessary to uncomment these restrictions when manual preparation for 3D data is implemented.

        # if not isinstance(_dict['width'], int):
        #     raise InvalidManifestError('Incorrect width field')
        # if not isinstance(_dict['height'], int):
        #     raise InvalidManifestError('Incorrect height field')

def is_manifest(full_manifest_path):
    return is_video_manifest(full_manifest_path) or \
        is_dataset_manifest(full_manifest_path)

def is_video_manifest(full_manifest_path):
    validator = _VideoManifestStructureValidator(full_manifest_path)
    return validator.validate()

def is_dataset_manifest(full_manifest_path):
    validator = _DatasetManifestStructureValidator(full_manifest_path)
    return validator.validate()
