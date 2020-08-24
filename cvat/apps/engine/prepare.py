import av
import hashlib

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

# class Frame:
#     def __init__(self, frame, frame_number=None):
#         self.frame = frame
#         if frame_number:
#             self.frame_number = frame_number

#     def md5_hash(self):
#         return hashlib.md5(self.frame.to_image().tobytes()).hexdigest()

#     def __eq__(self, image):
#         return self.md5_hash(self) == image.md5_hash(image) and self.frame.pts == image.frame.pts

#     def __ne__(self, image):
#         return md5_hash(self) != md5_hash(image) or self.frame.pts != image.frame.pts

#     def __len__(self):
#         return (self.frame.width, self.frame.height)


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

    def check_seek_key_frames(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        key_frames_copy = self.key_frames.copy()

        for index, key_frame in key_frames_copy.items():
            container.seek(offset=key_frame.pts, stream=video_stream)
            flag = True
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    if md5_hash(frame) != md5_hash(key_frame) or frame.pts != key_frame.pts:
                        self.key_frames.pop(index)
                    flag = False
                    break
                if not flag:
                    break

        if len(self.key_frames) == 0: #or self.frames // len(self.key_frames) > 300:
            raise Exception('Too few keyframes')

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

                #TODO: исправить если вдруг ключевой кадр окажется не первым
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
                    yield frame
                elif (frame_number - start_chunk_frame_number) % step:
                    continue
                else:
                    self._close_video_container(container)
                    return

        self._close_video_container(container)