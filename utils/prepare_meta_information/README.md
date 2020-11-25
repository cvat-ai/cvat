# Simple command line for prepare meta information for video data

**Usage**

```bash
usage: prepare.py [-h] [-chunk_size CHUNK_SIZE] video_file meta_directory

positional arguments:
  video_file            Path to video file
  meta_directory        Directory where the file with meta information will be saved

optional arguments:
  -h, --help            show this help message and exit
  -chunk_size CHUNK_SIZE
                        Chunk size that will be specified when creating the task with specified video and generated meta information
```

**NOTE**: For smooth video decoding, the `chunk size` must be greater than or equal to the ratio of number of frames
to a number of key frames.
You can understand the approximate `chunk size` by preparing and looking at the file with meta information.

**NOTE**: If ratio of number of frames to number of key frames is small compared to the `chunk size`,
then when creating a task with prepared meta information, you should expect that the waiting time for some chunks
will be longer than the waiting time for other chunks. (At the first iteration, when there is no chunk in the cache)

**Examples**

```bash
python prepare.py ~/Documents/some_video.mp4 ~/Documents
```
