# How to contribute to Computer Vision Annotation Tool (CVAT)

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

## Development environment

Next steps should work on clear Ubuntu 18.04.

- Install necessary dependencies:

```sh
$ sudo apt-get install -y curl redis-server python3-dev python3-pip python3-venv libldap2-dev libsasl2-dev
```

- Install [Visual Studio Code](https://code.visualstudio.com/docs/setup/linux#_debian-and-ubuntu-based-distributions) for development

- Install CVAT on your local host:

```sh
$ git clone https://github.com/opencv/cvat
$ cd cvat && mkdir logs keys
$ python3 -m venv .env
$ . .env/bin/activate
$ pip install -U pip wheel
$ pip install -r cvat/requirements/development.txt
$ python manage.py migrate
$ python manage.py collectstatic
```

- Create a super user for CVAT:

```sh
$ python manage.py createsuperuser
Username (leave blank to use 'django'): ***
Email address: ***
Password: ***
Password (again): ***
```

- Run Visual Studio Code from the virtual environment

```
$ code .
```

- Inside Visual Studio Code install [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) and [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extensions

- Reload Visual Studio Code

- Select `CVAT Debugging` configuration and start debugging (F5)

You have done! Now it is possible to insert breakpoints and debug server and client of the tool.