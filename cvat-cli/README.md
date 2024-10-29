# Command-line client for CVAT

A simple command line interface for working with CVAT. At the moment it
implements a basic feature set but may serve as the starting point for a more
comprehensive CVAT administration tool in the future.

Overview of functionality:

- Tasks:
  - Create a new task
  - Create a task from a backup file
  - Delete tasks
  - List all tasks
  - Download frames from a task
  - Export a task as a dataset
  - Import annotations into a task from a dataset
  - Back up a task
  - Automatically annotate a task using a local function

## Installation

`pip install cvat-cli`

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

## Examples

Create a task with local images:

```bash
cvat-cli --auth user task create
    --labels '[{"name": "car"}, {"name": "person"}]'
    "test_task"
    "local"
    "image1.jpg" "image2.jpg"
```

List tasks on a custom server with auth:

```bash
cvat-cli --auth admin:password \
    --server-host cvat.my.server.com --server-port 30123 \
    task ls
```
