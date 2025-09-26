# Description
In version 2.46.0, CVAT upgraded the FFMPEG library it uses to split videos into frames from 4.3.1 to 8.0.

There is a small chance that some video files may be split into frames differently by different FFmpeg versions.

In case of any difference in frame decoding,
this script may be used to switch a task to static chunks and generate frames with the old FFMPEG version.

# Usage

If your CVAT is deployed through docker, run
```shell
docker compose -f ./utils/switch_task_to_static/docker-compose.yaml run --rm generate_chunks_for_task <task id>
```
