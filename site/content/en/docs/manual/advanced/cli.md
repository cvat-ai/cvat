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

## Usage

To access the CLI, you need to have python in environment,
as well as a clone of the CVAT repository and the necessary modules:

```bash
git clone https://github.com/openvinotoolkit/cvat.git
cd cvat/utils/cli
pip install -r requirements.txt
```

You will get help with `cli.py`.

```
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
```
usage: cli.py ls [-h] [--json]

List all CVAT tasks in simple or JSON format.

optional arguments:
  -h, --help  show this help message and exit
  --json      output JSON data
```

## Examples

### Create

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

### Delete

- Delete tasks with id "100", "101", "102":
  ```bash
  cli.py delete 100 101 102
  ```

### List

- List all tasks:
  ```bash
  cli.py ls
  ```
- Save list of all tasks into file `list_of_tasks.json`:
  ```bash
  cli.py ls > list_of_tasks.json
  ```

### Dump annotation

- Dump annotation task with id 103, in the format "CVAT for images 1.1" and save to the file "output.xml":
  ```bash
  cli.py dump --format "CVAT for images 1.1" 103 output.xml
  ```
