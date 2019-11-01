# Dataset framework

A framework to prepare, manage, build, analyze datasets

## Documentation

-[Quick start guide](docs/quickstart.md)

## Installation

Python3.5+ is required.

To install into a virtual environment do:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
pip install -r requirements.txt
```

## Execution

The tool can be executed both as a script and as a module.

``` bash
PYTHONPATH="..."
python -m datumaro <command>
python path/to/datum.py
```

## Testing

``` bash
python -m unittest discover -s tests
```
