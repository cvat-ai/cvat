---
title: 'Command line interface (CLI)'
linkTitle: 'CLI'
weight: 32
description: 'Guide to working with CVAT tasks in the command line interface. This section on [GitHub](https://github.com/openvinotoolkit/cvat/tree/develop/utils/cli).'
---

**Description**
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

**Usage**

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

**Examples**

- Create a task
  `cli.py create "new task" --labels labels.json local file1.jpg file2.jpg`
- Delete some tasks
  `cli.py delete 100 101 102`
- List all tasks
  `cli.py ls`
- Dump annotations
  `cli.py dump --format "CVAT for images 1.1" 103 output.xml`
