---
title: 'Command line interface (CLI)'
linkTitle: 'CLI'
weight: 28
description: 'Guide to working with CVAT tasks in the command line interface. This section on [GitHub](https://github.com/openvinotoolkit/cvat/tree/develop/utils/cli).'
---

## Description

A simple command line interface for working with CVAT tasks. At the moment it
implements a basic feature set but may serve as the starting point for a more
comprehensive CVAT administration tool in the future.

Overview of functionality:

- Create a new task (supports name, bug tracker, project, labels JSON, local/share/remote files)
- Delete tasks (supports deleting a list of task IDs)
- List all tasks (supports basic CSV or JSON output)
- Download JPEG frames (supports a list of frame IDs)
- Dump annotations (supports all formats via format string)
- Upload annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0')
- Export and download a whole task
- Import a task

CVAT Command line interface use `argparse`.
For learn more read the [argparse documentation](https://docs.python.org/library/argparse.html#).

## Usage

If you want to access the console remotely via `ssh`,
place the `ssh keys` in the repository `ssh` folder before deploying cvat
[read more](https://github.com/openvinotoolkit/cvat/blob/develop/ssh/README.md).

Or, if you deployed CVAT using docker, to access the CLI, run:

```bash
docker exec -it cvat bash
cd utils/cli
./cli.py -h
```

You will get help with `cli.py`.

```bash
usage: cli.py [-h] [--auth USER:[PASS]] [--server-host SERVER_HOST]
              [--server-port SERVER_PORT] [--debug]
              {create,delete,ls,frames,dump,upload,export,import} ...

Perform common operations related to CVAT tasks.

positional arguments:
  {create,delete,ls,frames,dump,upload,export,import}

optional arguments:
  -h, --help            show this help message and exit
  --auth USER:[PASS]    defaults to the current user and supports the PASS
                        environment variable or password prompt.
  --server-host SERVER_HOST
                        host (default: localhost)
  --server-port SERVER_PORT
                        port (default: 8080)
  --https
                        using https connection (default: False)
  --debug               show debug output
```

You can get help for each positional argument, e.g. `ls`:

```bash
./cli.py ls -h
```
```bash
usage: cli.py ls [-h] [--json]

List all CVAT tasks in simple or JSON format.

optional arguments:
  -h, --help  show this help message and exit
  --json      output JSON data
```

## Examples

- Create a task named "new task", labels from the file "labels.json" and local images "file1.jpg" and "file2.jpg":
  ```bash
  cli.py create "new task" --labels labels.json local file1.jpg file2.jpg
  ```
- Create a task named "task 1", labels from the project with id 1 and with a remote video file,
  the task will be created as user "user-1":
  ```bash
  cli.py --auth user-1:password create "task 1" --project_id 1 \
  remote https://github.com/opencv/opencv/blob/master/samples/data/vtest.avi?raw=true
  ```
- Delete tasks with id "100", "101", "102":
  ```bash
  cli.py delete 100 101 102
  ```
- List all tasks:
  ```bash
  cli.py ls
  ```
- Dump annotation task with id 103, in the format "CVAT for images 1.1" and save to the file "output.xml":
  ```bash
  cli.py dump --format "CVAT for images 1.1" 103 output.xml
  ```

## Arguments

### Options

- `-h`, `--help` - show help message and exit
- `--auth USER:[PASS]` - defaults to the current user and supports the PASS environment variable or password prompt
- `--server-host SERVER_HOST` - host (default: `localhost`)
- `--server-port SERVER_PORT` - port (default: `8080`)
- `--https` - using https connection (default: `False`)
- `--debug ` - show debug output

### Create

- `create` - create a new CVAT task. To create a task, you need to specify labels using the `--labels` argument
  or attach the task to an existing project using the `--project_id` argument.
- `name` - name of the task
- `--labels LABELS` - string or file containing JSON labels specification
  Example JSON labels file structure:
  ```json
  [
      {
          "name": "car",
          "color": "#2080c0",
          "attributes": [
            {
              "name": "model",
              "input_type": "text",
              "mutable": false,
            },
          ]
      },
      {
          "name": "person",
          "color": "#c06060",
          "attributes": []
      }
  ]
  ```
  You can create a JSON label specification by using the [label constructor](/docs/manual/basics/creating_an_annotation_task/#labels)
- `--project_id PROJECT_ID` - project ID if project exists
- `--overlap OVERLAP` - the number of intersected frames between different segments
- `--segment_size SEGMENT_SIZE` - the number of frames in a segment
- `--bug BUG` - bug tracker URL
- `{local,share,remote}` - type of files specified
  - `local` - use if you want to upload local files
  - `remote` - use if you want to retrieve files from remote storage
  - `share` -use if you want to download files from a share  storage
- `resources` - list of paths to files or URLs. If you use a list file,
  each path or URL must be written on a separate line
- `--annotation_path ANNOTATION_PATH` - path to annotation file, input for attach annotation
- `--annotation_format ANNOTATION_FORMAT` - format of the annotation file being uploaded, e.g. `CVAT 1.1`
- `--completion_verification_period COMPLETION_VERIFICATION_PERIOD` - number of seconds to wait until checking
  if data compression finished (necessary before uploading annotations)
- `--dataset_repository_url DATASET_REPOSITORY_URL` - git repository to store annotations
  e.g. `https://github.com/user/repos [annotation/<anno_file_name.zip>]`
- `--lfs` - using lfs for dataset repository (default: `False`)
- `--image_quality IMAGE_QUALITY` - set the image quality option in the advanced configuration when creating tasks
  (default: `70`)
- `--frame_step FRAME_STEP` -
  set the frame step option in the advanced configuration when uploading image series or videos (default: `1`)
- `--copy_data` - set the option to copy the data, only used when resource type is share (default: `False`)
- `--use_cache` - set the option to use the cache (default: `True`)
- `--sorting-method {lexicographical,natural,predefined,random}` - data sorting method (default: `lexicographical`)

### Delete

- `delete` - delete a CVAT task
- `task_ids` - list of task IDs

### List

- `ls` - list all CVAT tasks in simple or JSON format
- `--json` - output JSON data

### Frames

- `frames` - download all frame images for a CVAT task
- `task_id` - task ID
- `frame_ids` - list of frame IDs to download
- `--outdir OUTDIR` - directory to save images (default: `CWD`)
- `--quality {original,compressed}` - choose quality of images (default: `original`)

### Dump Annotations

- `dump` - download annotations for a CVAT task
- `task_id` - task ID
- `filename` - output file
- `--format FILEFORMAT` - annotation format [list of supported formats](/docs/manual/advanced/formats),
  (default: `CVAT for images 1.1`)

### Upload Annotations

- `upload` - upload annotations for a CVAT task
- `task_id` - task ID
- `filename` - upload file
- `--format FILEFORMAT` - annotation format [list of supported formats](/docs/manual/advanced/formats),
  (default: `CVAT 1.1`)

### Export task

- `export`- export a CVAT task
- `task_id` - task ID
- `filename` - output filename

### Import task

- `import` - import a CVAT task
- `filename` - upload filename
