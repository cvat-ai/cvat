import av

class PrepareInfo:

    def __init__(self, source_path, meta_path):
        self.source_path = source_path
        self.meta_path = meta_path

    def _open_video_container(self, sourse_path, mode, options=None):
        return av.open(sourse_path, mode=mode, options=options)

    def _close_video_container(self, container):
        container.close()

    def _get_video_stream(self, container):
        video_stream = next(stream for stream in container.streams if stream.type == 'video')
        video_stream.thread_type = 'AUTO'
        return video_stream

    #@get_execution_time
    def save_meta_info(self):
        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)

        with open(self.meta_path, 'w') as file:
            frame_number = 0

            for packet in  container.demux(video_stream):
                for frame in packet.decode():
                    frame_number += 1
                    if frame.key_frame:
                        file.write('{} {}\n'.format(frame_number, frame.pts))

        self._close_video_container(container)
        return frame_number# == task_size

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

    def decode_needed_frames(self, chunk_number, chunk_size):
        start_chunk_frame_number = (chunk_number - 1) * chunk_size + 1
        end_chunk_frame_number = start_chunk_frame_number + chunk_size #- 1
        start_decode_frame_number, start_decode_timestamp = self.get_nearest_left_key_frame(start_chunk_frame_number)
        extra_frames = start_chunk_frame_number - start_decode_frame_number

        container = self._open_video_container(self.source_path, mode='r')
        video_stream = self._get_video_stream(container)
        container.seek(offset=start_decode_timestamp, stream=video_stream)

        frame_number = start_decode_frame_number - 1
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                frame_number += 1
                if frame_number < start_chunk_frame_number:
                    continue
                elif frame_number < end_chunk_frame_number:
                    yield frame
                else:
                    self._close_video_container(container)
                    return

        self._close_video_container(container)
