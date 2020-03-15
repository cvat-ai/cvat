## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Design](#design-and-code-structure)

## Installation

### Prerequisites

- Python (3.5+)
- OpenVINO (optional)

``` bash
git clone https://github.com/opencv/cvat
```

Optionally, install a virtual environment:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
```

Then install all dependencies:

``` bash
while read -r p; do pip install $p; done < requirements.txt
```

If you're working inside CVAT environment:
``` bash
. .env/bin/activate
while read -r p; do pip install $p; done < datumaro/requirements.txt
```

## Usage

> The directory containing Datumaro should be in the `PYTHONPATH`
> environment variable or `cvat/datumaro/` should be the current directory.

``` bash
datum --help
python -m datumaro --help
python datumaro/ --help
python datum.py --help
```

``` python
import datumaro
```

## Testing

It is expected that all Datumaro functionality is covered and checked by
unit tests. Tests are placed in `tests/` directory.

To run tests use:

``` bash
python -m unittest discover -s tests
```

If you're working inside CVAT environment, you can also use:

``` bash
python manage.py test datumaro/
```

## Design and code structure

- [Design document](docs/design.md)

### Command-line

Use [Docker](https://www.docker.com/) as an example. Basically,
the interface is divided on contexts and single commands.
Contexts are semantically grouped commands,
related to a single topic or target. Single commands are handy shorter
alternatives for the most used commands and also special commands,
which are hard to be put into any specific context.

![cli-design-image](docs/images/cli_design.png)

- The diagram above was created with [FreeMind](http://freemind.sourceforge.net/wiki/index.php/Main_Page)

Model-View-ViewModel (MVVM) UI pattern is used.

![mvvm-image](docs/images/mvvm.png)

### Datumaro project and environment structure

<!--lint disable fenced-code-flag-->
```
├── [datumaro module]
└── [project folder]
    ├── .datumaro/
    |   ├── config.yml
    │   ├── .git/
    │   ├── models/
    │   └── plugins/
    │       ├── plugin1/
    │       |   ├── file1.py
    │       |   └── file2.py
    │       ├── plugin2.py
    │       ├── custom_extractor1.py
    │       └── ...
    ├── dataset/
    └── sources/
        ├── source1
        └── ...
```
<!--lint enable fenced-code-flag-->

### Plugins

Plugins are optional components, which extend the project. In Datumaro there are
several types of plugins, which include:
- `extractor` - produces dataset items from data source
- `importer` - recognizes dataset type and creates project
- `converter` - exports dataset to a specific format
- `transformation` - modifies dataset items or other properties
- `launcher` - executes models

Plugins reside in plugin directories:
- `datumaro/plugins` for builtin components
- `<project_dir>/.datumaro/plugins` for project-specific components

A plugin is a python file or package with any name, which exports some symbols.
To export a symbol put it to `exports` list of the module like this:

``` python
class MyComponent1: ...
class MyComponent2: ...
exports = [MyComponent1, MyComponent2]
```

or inherit it from one of special classes:
``` python
from datumaro.components.extractor import Importer, SourceExtractor, Transform
from datumaro.components.launcher import Launcher
from datumaro.components.converter import Converter
```

There is an additional class to modify plugin appearance at command line:

``` python
from datumaro.components.cli_plugin import CliPlugin
```

Plugin example:

<!--lint disable fenced-code-flag-->

```
datumaro/plugins/
- my_plugin1/file1.py
- my_plugin1/file2.py
- my_plugin2.py
```

<!--lint enable fenced-code-flag-->

`my_plugin1/file2.py` contents:

``` python
from datumaro.components.extractor import Transform, CliPlugin
from .file1 import something, useful

class MyTransform(Transform, CliPlugin):
    NAME = "custom_name"
    """
    Some description.
    """
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-q', help="Some help")
        return parser
   ...
```

`my_plugin2.py` contents:

``` python
from datumaro.components.extractor import SourceExtractor

class MyFormat: ...
class MyFormatExtractor(SourceExtractor): ...

exports = [MyFormat] # explicit exports declaration
# MyFormatExtractor won't be exported
```
