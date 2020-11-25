# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import av
from collections import OrderedDict
import hashlib
import os
from cvat.apps.engine.utils import rotate_image

class WorkWithVideo:
    def __init__(self, **kwargs):
        if not kwargs.get('source_path'):
            raise Exception('No sourse path')
        self.source_path = kwargs.get('source_path')

    def _open_video_container(self, sourse_path, mode, options=None):
        return av.open(sourse_path, mode=mode, options=options)

    def _close_video_container(self, container):
        container.close()

    def _get_video_stream(self, container):
        video_stream = next(stream for stream in container.streams if stream.type == 'video')
        video_stream.thread_type = 'AUTO'
        return video_stream

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

def md5_hash(frame):
    return hashlib.md5(frame.to_image().tobytes()).hexdigest()

class PrepareInfo(WorkWithVideo):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        if not kwargs.get('meta_path'):
            raise Exception('No meta path')

        self.meta_path = kwargs.get('meta_path')
        self.key_frames = {}
        self.frames = 0

    def get_task_size(self):
        return self.frames

    @property
    def frame_sizes(self):
        container = self._open_video_container(self.source_path, 'r')
        frame = next(iter(self.key_frames.values()))
        if container.streams.video[0].metadata.get('rotate'):
            frame = av.VideoFrame().from_ndarray(
                rotate_image(
                    frame.to_ndarray(format='bgr24'),
                    360 - int(container.streams.video[0].metadata.get('rotate'))
                ),
                format ='bgr24'
            )
        self._close_video_container(container)
        return (frame.width, frame.height)

    def check_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if md5_hash(frame) != md5_hash(key_frame[1]) or frame.pts != key_frame[1].pts:
                    self.key_frames.pop(key_frame[0])
                return

    def check_seek_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        key_frames_copy = self.key_frames.copy()

        for key_frame in key_frames_copy.items():
            container.seek(offset=key_frame[1].pts, stream=video_stream)
            self.check_key_frame(container, video_stream, key_frame)

    def check_frames_ratio(self, chunk_size):
        return (len(self.key_frames) and (self.frames // len(self.key_frames)) <= 2 * chunk_size)

    def save_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        frame_number = 0

        for packet in  container.demux(video_stream):
            for frame in packet.decode():
                if frame.key_frame:
                    self.key_frames[frame_number] = frame
                frame_number += 1

        self.frames = frame_number
        self._close_video_container(container)

    def save_meta_info(self):
        with open(self.meta_path, 'w') as meta_file:
            for index, frame in self.key_frames.items():
                meta_file.write('{} {}\n'.format(index, frame.pts))

    def get_nearest_left_key_frame(self, start_chunk_frame_number):
        start_decode_frame_number = 0
        start_decode_timestamp = 0

        with open(self.meta_path, 'r') as file:
            for line in file:
                frame_number, timestamp = line.strip().split(' ')

                if int(frame_number) <= start_chunk_frame_number:
                    start_decode_frame_number = frame_number
                    start_decode_timestamp = timestamp
                else:
                    break

        return int(start_decode_frame_number), int(start_decode_timestamp)

    def decode_needed_frames(self, chunk_number, db_data):
        step = db_data.get_frame_step()
        start_chunk_frame_number = db_data.start_frame + chunk_number * db_data.chunk_size * step
        end_chunk_frame_number = min(start_chunk_frame_number + (db_data.chunk_size - 1) * step + 1, db_data.stop_frame + 1)
        start_decode_frame_number, start_decode_timestamp = self.get_nearest_left_key_frame(start_chunk_frame_number)
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        container.seek(offset=start_decode_timestamp, stream=video_stream)

        frame_number = start_decode_frame_number - 1
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                frame_number += 1
                if frame_number < start_chunk_frame_number:
                    continue
                elif frame_number < end_chunk_frame_number and not ((frame_number - start_chunk_frame_number) % step):
                    if video_stream.metadata.get('rotate'):
                        frame = av.VideoFrame().from_ndarray(
                            rotate_image(
                                frame.to_ndarray(format='bgr24'),
                                360 - int(container.streams.video[0].metadata.get('rotate'))
                            ),
                            format ='bgr24'
                        )
                    yield frame
                elif (frame_number - start_chunk_frame_number) % step:
                    continue
                else:
                    self._close_video_container(container)
                    return

        self._close_video_container(container)

class UploadedMeta(PrepareInfo):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        with open(self.meta_path, 'r') as meta_file:
            lines = meta_file.read().strip().split('\n')
            self.frames = int(lines.pop())

            key_frames = {int(line.split()[0]): int(line.split()[1]) for line in lines}
            self.key_frames = OrderedDict(sorted(key_frames.items(), key=lambda x: x[0]))

    @property
    def frame_sizes(self):
        container = self._open_video_container(self.source_path, 'r')
        video_stream = self._get_video_stream(container)
        container.seek(offset=next(iter(self.key_frames.values())), stream=video_stream)
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                if video_stream.metadata.get('rotate'):
                    frame = av.VideoFrame().from_ndarray(
                        rotate_image(
                            frame.to_ndarray(format='bgr24'),
                            360 - int(container.streams.video[0].metadata.get('rotate'))
                        ),
                        format ='bgr24'
                    )
                self._close_video_container(container)
                return (frame.width, frame.height)

    def save_meta_info(self):
        with open(self.meta_path, 'w') as meta_file:
            for index, pts in self.key_frames.items():
                meta_file.write('{} {}\n'.format(index, pts))

    def check_key_frame(self, container, video_stream, key_frame):
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                assert frame.pts == key_frame[1], "Uploaded meta information does not match the video"
                return

    def check_seek_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        for key_frame in self.key_frames.items():
            container.seek(offset=key_frame[1], stream=video_stream)
            self.check_key_frame(container, video_stream, key_frame)

        self._close_video_container(container)

    def check_frames_numbers(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        # not all videos contain information about numbers of frames
        if video_stream.frames:
            self._close_video_container(container)
            assert video_stream.frames == self.frames, "Uploaded meta information does not match the video"
            return
        self._close_video_container(container)

def prepare_meta(media_file, upload_dir=None, meta_dir=None, chunk_size=None):
    paths = {
        'source_path': os.path.join(upload_dir, media_file) if upload_dir else media_file,
        'meta_path': os.path.join(meta_dir, 'meta_info.txt') if meta_dir else os.path.join(upload_dir, 'meta_info.txt'),
    }
    analyzer = AnalyzeVideo(source_path=paths.get('source_path'))
    analyzer.check_type_first_frame()
    analyzer.check_video_timestamps_sequences()

    meta_info = PrepareInfo(source_path=paths.get('source_path'),
                            meta_path=paths.get('meta_path'))
    meta_info.save_key_frames()
    meta_info.check_seek_key_frames()
    meta_info.save_meta_info()
    smooth_decoding = meta_info.check_frames_ratio(chunk_size) if chunk_size else None
    return (meta_info, smooth_decoding)

def prepare_meta_for_upload(func, *args):
    meta_info, smooth_decoding = func(*args)
    with open(meta_info.meta_path, 'a') as meta_file:
        meta_file.write(str(meta_info.get_task_size()))
    return smooth_decoding
