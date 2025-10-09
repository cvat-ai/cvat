# Description
In version 2.47.0, CVAT upgraded the FFMPEG library it uses to split videos into frames from 4.3.1 to 8.0.

There is a small chance that some video files may be split into frames differently by different FFmpeg versions.

In the case of any difference in frame decoding,
this script may be used to switch a task to static chunks and generate frames with the old FFMPEG version.

> NOTE: This option requires administrator
> access to the server instance. If you do not have such access, please try
> to contact the server administration.

# Usage

If your CVAT is deployed through docker, run
```shell
docker compose \
  -f docker-compose.yml \
  \  # optionally -f docker-compose.dev.yml \
  -f ./utils/ffmpeg_compatibility/docker-compose.yml \
  run --rm generate_chunks_for_task <task_id>
```
