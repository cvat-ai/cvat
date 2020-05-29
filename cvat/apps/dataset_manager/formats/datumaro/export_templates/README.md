# Quick start

``` bash
# optionally make a virtualenv
python -m virtualenv .venv
. .venv/bin/activate

# install dependencies
pip install -e datumaro/
pip install -r cvat/utils/cli/requirements.txt

# set up environment
PYTHONPATH=':'
export PYTHONPATH

# use Datumaro
datum --help
```

Check Datumaro [docs](datumaro/README.md) for more info.
