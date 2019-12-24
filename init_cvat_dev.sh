#!/bin/bash
mkdir logs keys
python3 -m venv .env
. .env/bin/activate
pip install -U pip wheel
pip install -r cvat/requirements/development.txt
pip install -r datumaro/requirements.txt
python manage.py migrate
python manage.py collectstatic

python manage.py createsuperuser

cd cvat-core && npm install
cd ../cvat-ui && npm install
#npm start