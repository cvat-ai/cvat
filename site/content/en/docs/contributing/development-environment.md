---
title: 'Development environment'
linkTitle: 'Development environment'
weight: 2
description: 'Installing a development environment for different operating systems.'
---

### Setup the dependencies:

- Install necessary dependencies:

  Ubuntu 22.04/20.04

  ```bash
  sudo apt-get update && sudo apt-get --no-install-recommends install -y build-essential curl git redis-server python3-dev python3-pip python3-venv python3-tk libldap2-dev libsasl2-dev
  ```

  ```bash
  # Install Node.js 20 and yarn
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt-get install -y nodejs
  sudo npm install --global yarn
  ```

  MacOS 10.15

  ```bash
  brew install git python pyenv redis curl openssl node sqlite3 geos
  ```

  Arch Linux

  ```bash
  # Update the system and AUR (you can use any other AUR helper of choice) first:
  sudo pacman -Syyu
  pikaur -Syu
  ```

  ```bash
  # Install the required dependencies:
  sudo pacman -S base-devel curl git redis cmake gcc python python-pip tk libldap libsasl pkgconf ffmpeg geos openldap
  ```

  ```bash
  # CVAT supports only Python 3.10, so install it if you don’t have it:
  pikaur -S python310
  ```

  ```bash
  # Install Node.js, yarn and npm
  sudo pacman -S nodejs-lts-gallium yarn npm
  ```

- Install Chrome

- Install [VS Code](https://code.visualstudio.com/docs/setup/linux#_debian-and-ubuntu-based-distributions).

- Install the following VScode extensions:

  - [JavaScript Debugger](https://marketplace.visualstudio.com/items?itemName=ms-vscode.js-debug)
  - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
  - [Prettier Formatter for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [licenser](https://marketplace.visualstudio.com/items?itemName=ymotongpoo.licenser)
  - [Trailing Spaces](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)
  - [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

- Make sure to use Python 3.10.0 or higher

  ```
  python3 --version
  ```

- Install CVAT on your local host:

  ```bash
  git clone https://github.com/cvat-ai/cvat
  cd cvat && mkdir logs keys
  python3 -m venv .env
  . .env/bin/activate
  pip install -U pip wheel setuptools
  pip install -r cvat/requirements/development.txt
  ```

  Note that the `.txt` files in the `cvat/requirements` directory
  have pinned dependencies intended for the main target OS/Python version
  (the one used in the main Dockerfile).
  If you're unable to install those dependency versions,
  you can substitute the corresponding `.in` files instead.
  That way, you're more likely to be able to install the dependencies,
  but their versions might not correspond to those used in production.

  > Note for Mac users
  >
  > If you have any problems with installing dependencies from
  > `cvat/requirements/*.txt`, you may need to reinstall your system python
  > In some cases after system update it can be configured incorrectly and cannot compile
  > some native modules
  >
  > Make sure Homebrew lib path is in `DYLD_LIBRARY_PATH`.
  > For Apple Silicon: `export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH`
  >
  > Homebrew will install FFMpeg 5.0 by default, which does not work, so you should install 4.X.
  > You can install older 4.X FFMpeg using Homebrew like that:
  >
  > ```
  >  cd "$(brew --repo homebrew/core)"
  >  git checkout addd616edc9134f057e33694c420f4900be59db8
  >  brew unlink ffmpeg
  >  HOMEBREW_NO_AUTO_UPDATE=1 brew install ffmpeg
  >  git checkout master
  > ```
  >
  > if you are still facing error `Running setup.py install for av ... error`, you may
  > try more radical variant
  >
  > ```
  >  cd "$(brew --repo homebrew/core)"
  >  git checkout addd616edc9134f057e33694c420f4900be59db8
  >  brew uninstall ffmpeg --force
  >  HOMEBREW_NO_AUTO_UPDATE=1 brew install ffmpeg
  >  git checkout master
  > ```
  >
  > If you faced with error `Failed building wheel for h5py`, you may need install `hdf5`
  >
  > ```
  > brew install hdf5
  > export HDF5_DIR="$(brew --prefix hdf5)"
  > pip install --no-binary=h5py h5py
  > ```
  >
  > If you faced with error
  > `OSError: Could not find library geos_c or load any of its variants ['libgeos_c.so.1', 'libgeos_c.so']`.
  > You may fix this using
  >
  > ```
  > sudo ln -s /opt/homebrew/lib/libgeos_c.dylib /usr/local/lib
  > ```

  > Note for Arch Linux users:
  >
  > Because PyAV as of version 10.0.0 already [works](https://github.com/PyAV-Org/PyAV/pull/910)
  > with FFMPEG5, you may consider changing the `av` version requirement
  > in `/cvat/cvat/requirements/base.txt` to 10.0.0 or higher.
  >
  > Perform this action before installing cvat requirements from the list mentioned above.

- Install [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and [Docker Compose](https://docs.docker.com/compose/install/)

- Start service dependencies:

  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build \
    cvat_opa cvat_db cvat_redis_inmem cvat_redis_ondisk cvat_server
  ```

  Note: this runs an extra copy of the CVAT server in order to supply rules to OPA.
  If you update the OPA rules, rerun this command to recreate the server image and container.

  Note: to stop these services, use
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml down`.
  You can add `-v` to remove the data, as well.

- Apply migrations and create a super user for CVAT:

  ```bash
  python manage.py migrate
  python manage.py collectstatic
  python manage.py createsuperuser
  ```

- Install npm packages for UI (run the following command from CVAT root directory):

  ```bash
  yarn --frozen-lockfile
  ```

  > Note for Mac users
  >
  > If you faced with error
  >
  > `Node Sass does not yet support your current environment: OS X 64-bit with Unsupported runtime (57)`
  >
  > Read this article [Node Sass does not yet support your current environment](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)

### Run CVAT

- Start npm UI debug server (run the following command from CVAT root directory):
  - If you want to run CVAT in localhost:
    ```sh
    yarn run start:cvat-ui
    ```
  - If you want to access CVAT from outside of your host:
    ```sh
    CVAT_UI_HOST='<YOUR_HOST_IP>' yarn run start:cvat-ui
    ```
- Open a new terminal window.
- Run VScode from the virtual environment (run the following command from CVAT root directory):

  ```sh
  source .env/bin/activate && code
  ```

- Inside VScode, Open CVAT root dir

- Select `server: debug` configuration and run it (F5) to run REST server and its workers
- Make sure that `Uncaught Exceptions` option under breakpoints section is unchecked
- If you choose to run CVAT in localhost: Select `server: chrome` configuration and run it (F5) to open CVAT in Chrome
- Alternative: If you changed CVAT_UI_HOST just enter `<YOUR_HOST_IP>:3000` in your browser.

> Note for Mac users
>
> You may have a permission denied problem starting the server because **AirPlay Receiver** running on port 5000/7000.
>
> Turn off AirPlay Receiver:
> _Go to System Settings_ → _General_ → _AirDrop & Handoff_ → _Untick Airplay Receiver_.


You have done! Now it is possible to insert breakpoints and debug server and client of the tool.
Instructions for running tests locally are available {{< ilink "/docs/contributing/running-tests" "here" >}}.

## Note for Windows users

You develop CVAT under WSL (Windows subsystem for Linux) following next steps.

- Install WSL using [this guide](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

- Following this guide install Ubuntu 18.04 Linux distribution for WSL.

- Run Ubuntu using start menu link or execute next command

  ```powershell
  wsl -d Ubuntu-18.04
  ```

- Run all commands from this installation guide in WSL Ubuntu shell.
- You might have to manually start the redis server in wsl before you can start the configuration inside
  Visual Studio Code. You can do this with `sudo service redis-server start`. Alternatively you can also
  use a redis docker image instead of using the redis-server locally.

## Note for Mac users

- You might have to manually start the redis server. You can do this with `redis-server`.
  Alternatively you can also use a redis docker image instead of using the redis-server locally.

## Note for Arch Linux users

- You need to start `redis` and `docker` services manually in order to begin debugging/running tests:
  ```bash
  sudo systemctl start redis.service
  sudo systemctl start docker.service
  ```

## CVAT Analytics Ports

In case you cannot access analytics, check if the following ports are open:

```yml
cvat_vector:
    ports:
      - '8282:80'

  cvat_clickhouse:
    ports:
      - '8123:8123'
```

In addition, you can completely disable analytics if you don't need it by deleting the following data from
[launch.json](https://github.com/cvat-ai/cvat/blob/develop/.vscode/launch.json):

```json
  "DJANGO_LOG_SERVER_HOST": "localhost",
  "DJANGO_LOG_SERVER_PORT": "8282"
```

Analytics on GitHub:
[Analytics Components](https://github.com/cvat-ai/cvat/tree/develop/components/analytics)

