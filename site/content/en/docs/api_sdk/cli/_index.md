---
title: 'Command line interface (CLI)'
linkTitle: 'CLI'
weight: 4
description: ''
---

## Overview

A simple command line interface for working with CVAT. At the moment it
implements a basic feature set but may serve as the starting point for a more
comprehensive CVAT administration tool in the future.

The following subcommands are supported:

- Projects:
  - `create` - create a new project
  - `delete` - delete projects
  - `ls` - list all projects

- Tasks:
  - `create` - create a new task
  - `create-from-backup` - create a task from a backup file
  - `delete` - delete tasks
  - `ls` - list all tasks
  - `frames` - download frames from a task
  - `export-dataset` - export a task as a dataset
  - `import-dataset` - import annotations into a task from a dataset
  - `backup` - back up a task
  - `auto-annotate` - automatically annotate a task using a local function

- Functions (Enterprise/Cloud only):
  - `create-native` - create a function that can be powered by an agent
  - `delete` - delete a function
  - `run-agent` - process requests for a native function

## Installation

To install an [official release of CVAT CLI](https://pypi.org/project/cvat-cli/), use this command:

```bash
pip install cvat-cli
```

We support Python versions 3.9 and higher.

## Usage

The general form of a CLI command is:

```console
$ cvat-cli <common options> <resource> <action> <options>
```

where:

- `<common options>` are options shared between all subcommands;
- `<resource>` is a CVAT resource, such as `task`;
- `<action>` is the action to do with the resource, such as `create`;
- `<options>` is any options specific to a particular resource and action.

You can list available subcommands and options using the `--help` option:

```
$ cvat-cli --help # get help on available common options and resources
$ cvat-cli <resource> --help # get help on actions for the given resource
$ cvat-cli <resource> <action> --help # get help on action-specific options
```

The CLI implements alias subcommands for some task actions, so that,
for example, `cvat-cli ls` works the same way as `cvat-cli task ls`. These
aliases are provided for backwards compatibility and are deprecated.
Use the `task <action>` form instead.

## Examples - tasks

### Create

Description of the options you can find in
{{< ilink "/docs/manual/basics/create_an_annotation_task" "Creating an annotation task" >}} section.

For create a task you need file contain labels in the `json` format, you can create a JSON label specification
by using the {{< ilink "/docs/manual/basics/create_an_annotation_task#labels" "label constructor" >}}.
<details>
<summary>Example JSON labels file</summary>

  ```json
  [
      {
          "name": "cat",
          "attributes": []
      },
      {
          "name": "dog",
          "attributes": []
      }
  ]
  ```
</details>
<br>

- Create a task named "new task" on the default server "localhost:8080", labels from the file "labels.json"
  and local images "file1.jpg" and "file2.jpg", the task will be created as current user:
  ```bash
  cvat-cli task create "new task" --labels labels.json local file1.jpg file2.jpg
  ```
- Create a task named "task 1" on the server "example.com" labels from the file "labels.json"
  and local image "image1.jpg", the task will be created as user "user-1":
  ```bash
  cvat-cli --server-host example.com --auth user-1 task create "task 1" \
  --labels labels.json local image1.jpg
  ```
- Create a task named "task 1" on the default server, with labels from "labels.json"
  and local image "file1.jpg", as the current user, in organization "myorg":
  ```bash
  cvat-cli --org myorg task create "task 1" --labels labels.json local file1.jpg
  ```
- Create a task named "task 1", labels from the project with id 1 and with a remote video file,
  the task will be created as user "user-1":
  ```bash
  cvat-cli --auth user-1:password task create "task 1" --project_id 1 \
  remote https://github.com/opencv/opencv/blob/master/samples/data/vtest.avi?raw=true
  ```
- Create a task named "task 1 sort random", with labels "cat" and "dog", with chunk size 8,
  with sorting-method random, frame step 10, copy the data on the CVAT server,
  with use zip chunks and the video file will be taken from the shared resource:
  ```bash
  cvat-cli task create "task 1 sort random" --labels '[{"name": "cat"},{"name": "dog"}]' --chunk_size 8 \
  --sorting-method random --frame_step 10 --copy_data --use_zip_chunks share //share/dataset_1/video.avi
  ```
- Create a task named "task from dataset_1", labels from the file "labels.json", with link to bug tracker,
  image quality will be reduced to 75, annotation in the format "CVAT 1.1" will be taken
  from the file "annotation.xml", the data will be loaded from "dataset_1/images/",
  the task will be created as user "user-2", and the password will need to be entered additionally:
  ```bash
  cvat-cli --auth user-2 task create "task from dataset_1" --labels labels.json \
  --bug_tracker https://bug-tracker.com/0001 --image_quality 75 --annotation_path annotation.xml \
  --annotation_format "CVAT 1.1" local dataset_1/images/
  ```
- Create a task named "segmented task 1", labels from the file "labels.json", with overlay size 5,
  segment size 100, with frames 5 through 705, using cache and with a remote video file:
  ```bash
  cvat-cli task create "segmented task 1" --labels labels.json --overlap 5 --segment_size 100 \
  --start_frame 5 --stop_frame 705 --use_cache \
  remote https://github.com/opencv/opencv/blob/master/samples/data/vtest.avi?raw=true
  ```
- Create a task named "task with filtered cloud storage data", with filename_pattern `test_images/*.jpeg`
  and using the data from the cloud storage resource described in the manifest.jsonl:
  ```bash
  cvat-cli task create "task with filtered cloud storage data" --labels '[{"name": "car"}]'\
  --use_cache --cloud_storage_id 1 --filename_pattern "test_images/*.jpeg" share manifest.jsonl
  ```
- Create a task named "task with filtered cloud storage data" using all data from the cloud storage resource
  described in the manifest.jsonl by specifying filename_pattern `*`:
  ```bash
  cvat-cli task create "task with filtered cloud storage data" --labels '[{"name": "car"}]'\
  --use_cache --cloud_storage_id 1 --filename_pattern "*" share manifest.jsonl
  ```

### Delete

- Delete tasks with IDs "100", "101", "102" , the command will be executed from "user-1" having delete permissions:
  ```bash
  cvat-cli --auth user-1:password task delete 100 101 102
  ```

### List

- List all tasks:
  ```bash
  cvat-cli task ls
  ```
- List all tasks in organization "myorg":
  ```bash
  cvat-cli --org myorg task ls
  ```
- Save list of all tasks into file "list_of_tasks.json":
  ```bash
  cvat-cli task ls --json > list_of_tasks.json
  ```

### Frames

- Save frame 12, 15, 22 from task with id 119, into "images" folder with compressed quality:
  ```bash
  cvat-cli task frames --outdir images --quality compressed 119 12 15 22
  ```

### Export as a dataset

- Export annotation task with id 103, in the format `CVAT for images 1.1` and save to the file "output.zip":
  ```bash
  cvat-cli task export-dataset --format "CVAT for images 1.1" 103 output.zip
  ```
- Export annotation task with id 104, in the format `COCO 1.0` and save to the file "output.zip":
  ```bash
  cvat-cli task export-dataset --format "COCO 1.0" 104 output.zip
  ```

### Import annotations from a dataset

- Import annotation into task with id 105, in the format `CVAT 1.1` from the file "annotation.xml":
  ```bash
  cvat-cli task import-dataset --format "CVAT 1.1" 105 annotation.xml
  ```

### Back up a task

- Back up task with id 136 to file "task_136.zip":
  ```bash
  cvat-cli task backup 136 task_136.zip
  ```

### Create from backup

- Create a task from backup file "task_backup.zip":
  ```bash
  cvat-cli task create-from-backup task_backup.zip
  ```

### Auto-annotate

This command provides a command-line interface
to the {{< ilink "/docs/api_sdk/sdk/auto-annotation" "auto-annotation API" >}}.

It can auto-annotate using AA functions implemented in one of the following ways:

1. As a Python module directly implementing the AA function protocol.
   Such a module must define the required attributes at the module level.

   For example:

   ```python
   import cvat_sdk.auto_annotation as cvataa

   spec = cvataa.DetectionFunctionSpec(...)

   def detect(context, image):
       ...
   ```

1. As a Python module implementing a factory function named `create`.
   This function must return an object implementing the AA function protocol.
   Any parameters specified on the command line using the `-p` option
   will be passed to `create`.

   For example:

   ```python
   import cvat_sdk.auto_annotation as cvataa

   class _MyFunction:
       def __init__(...):
           ...

       spec = cvataa.DetectionFunctionSpec(...)

       def detect(context, image):
           ...

   def create(...) -> cvataa.DetectionFunction:
       return _MyFunction(...)
   ```

- Annotate the task with id 137 with the predefined torchvision detection function,
  which is parameterized:
  ```bash
  cvat-cli task auto-annotate 137 --function-module cvat_sdk.auto_annotation.functions.torchvision_detection \
      -p model_name=str:fasterrcnn_resnet50_fpn_v2 -p box_score_thresh=float:0.5
  ```

- Annotate the task with id 138 with an AA function defined in `my_func.py`:
  ```bash
  cvat-cli task auto-annotate 138 --function-file path/to/my_func.py
  ```

Note that this command does not modify the Python module search path.
If your function module needs to import other local modules,
you must add your module directory to the search path
if it isn't there already.

- Annotate the task with id 139 with a function defined in the `my_func` module
  located in the `my-project` directory,
  letting it import other modules from that directory.
  ```bash
  PYTHONPATH=path/to/my-project cvat-cli task auto-annotate 139 --function-module my_func
  ```

## Examples - projects

### Create

While creating a project, you may optionally define its labels.
The `project create` command accepts labels in the same format as the `task create` command;
see that command's examples for more information.

- Create a project named "new project" on the default server "localhost:8080",
  with labels from the file "labels.json":
  ```bash
  cvat-cli project create "new project" --labels labels.json
  ```
- Create a project from a dataset in the COCO format:
  ```bash
  cvat-cli project create "new project" --dataset_file coco.zip --dataset_format "COCO 1.0"
  ```

### Delete

- Delete projects with IDs "100", "101", "102":
  ```bash
  cvat-cli project delete 100 101 102
  ```

### List

- List all projects:
  ```bash
  cvat-cli project ls
  ```
- Save list of all projects into file "list_of_projects.json":
  ```bash
  cvat-cli project ls --json > list_of_projects.json
  ```

## Examples - functions

**Note**: The functionality described in this section can only be used
with the CVAT Enterprise or CVAT Cloud.

### Create

- Create a function that uses a detection model from torchvision
  and run an agent for it:

  ```
  cvat-cli function create-native "Faster R-CNN" \
      --function-module cvat_sdk.auto_annotation.functions.torchvision_detection \
      -p model_name=str:fasterrcnn_resnet50_fpn_v2
  cvat-cli function run-agent <ID printed by previous command> \
      --function-module cvat_sdk.auto_annotation.functions.torchvision_detection \
      -p model_name=str:fasterrcnn_resnet50_fpn_v2
  ```

These commands accept functions that implement the
{{< ilink "/docs/api_sdk/sdk/auto-annotation" "auto-annotation function interface" >}}
from the SDK, same as the `task auto-annotate` command.
See that command's examples for information on how to implement these functions
and specify them in the command line.

### Delete

- Delete functions with IDs 100 and 101:
  ```
  cvat-cli function delete 100 101
  ```
