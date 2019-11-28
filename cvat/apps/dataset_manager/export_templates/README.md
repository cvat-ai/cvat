# Quick start

``` bash
# optionally make a virtualenv
python -m virtualenv .venv
. .venv/bin/activate

# install dependencies
sed -r "s/^(.*)#.*$/\1/g" datumaro/requirements.txt | xargs -n 1 -L 1 pip install
pip install -r cvat/utils/cli/requirements.txt

# set up environment
PYTHONPATH=':'
export PYTHONPATH
ln -s $PWD/datumaro/datum.py ./datum
chmod a+x datum

# use Datumaro
./datum --help
```

Check Datumaro [QUICKSTART.md](datumaro/docs/quickstart.md) for further info.
