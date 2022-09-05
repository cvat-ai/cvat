# Command-line client for CVAT

## Installation

`pip install cvat-cli`

## Usage

```bash
$ cvat-cli --help

usage: cvat-cli [-h] [--version] [--auth USER:[PASS]]
  [--server-host SERVER_HOST] [--server-port SERVER_PORT] [--https] [--debug]
  {create,delete,ls,frames,dump,upload,export,import} ...

Perform common operations related to CVAT tasks.

positional arguments:
  {create,delete,ls,frames,dump,upload,export,import}

optional arguments:
  -h, --help            show this help message and exit
  --version             show program's version number and exit
  --auth USER:[PASS]    defaults to the current user and supports the PASS
                        environment variable or password prompt
                        (default: current user)
  --server-host SERVER_HOST
                        host (default: localhost)
  --server-port SERVER_PORT
                        port (default: 8080)
  --https               force https connection (default: try to detect automatically)
  --debug               show debug output
```

## Examples

Create a task with local images:

```bash
cvat-cli --auth user create
    --labels '[{"name": "car"}, {"name": "person"}]'
    "test_task"
    "local"
    "image1.jpg" "image2.jpg"
```

List tasks on a custom server with auth:

```bash
cvat-cli --auth admin:password \
    --server-host cvat.my.server.com --server-port 30123 \
    ls
```
