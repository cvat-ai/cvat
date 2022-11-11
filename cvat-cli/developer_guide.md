# Developer guide

Install testing requirements:

```bash
pip install -r requirements/testing.txt
```

Run unit tests:
```
cd cvat/
python manage.py test --settings cvat.settings.testing cvat-cli/
```

Install package in the editable mode:

```bash
pip install -e .
```
