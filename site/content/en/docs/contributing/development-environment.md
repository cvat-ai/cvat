---
title: 'Development environment'
linkTitle: 'Development environment'
weight: 2
description: 'Installing a development environment for different operating systems.'
---

## Remote development guide
### Dependencies
- Install Chrome
- Install [VS Code](https://code.visualstudio.com/docs/setup/setup-overview) or [VS Code Insiders](https://code.visualstudio.com/insiders/) in case when extensions are not installed after start of the dev container
  - Install the [Dev Container](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for local development containers, ensuring all system requirements specified in the documentation are met.
  - Install [GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) extension for Codespaces
- Install [git](https://git-scm.com/downloads)
  - For Windows users following guides may be helpful
    - [Get started with using Git on Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-git)
- Connect to GitHub using SSH. ([guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh))
- The system should have POSIX `sh` shell for running initial shell scripts

### Optional steps
- In the root directory of the repository create a `.env` file with the variables mentioned in `dist.env` file and modify their values
  - If not created, default values are taken from the docker-compose file inside the `.devcontainer/docker-compose.yml`
- In `.devcontainer` directory create a `.env` file with variables mentioned in `dist.env` file
The `GIT_BRANCH_ISOLATION` environment variable, used during the build process of the dev container, controls whether Docker volumes are namespaced by the Git branch name, thus enabling data persistence across builds. This variable is set to `true` by default.

### Local Dev-Container guide
- Upon opening the repository in VS Code, click on the green color icon in the bottom left corner of the window labeled `Open Remote Window` and select `reopen in container`
Initially, setting up may take some time as it involves building the dev container image and pulling the required Docker images. Subsequent builds will be faster, utilizing cached data to expedite the process.
- The container data is persisted between builds with the help of named volumes and each volume is namespaced by git branch name. Therefore one can create separate dev container environment specific to the current working git branch. This can be helpful for reviewing pull requests and making quick bug fixes

### GitHub Codespaces guide
- Sign into GitHub from VS Code account panel or using GitHub Codespace extension
- Click on the green color icon in the bottom left corner of the window labeled `Open Remote Window` and select `create new codespace`
- Select your forked CVAT repository and the branch name
- Select the machine type
- Again from the `Open Remote Window` menu, select `connect to codespace` and select the codespace you created in the previous step and the container shall start building
- The container data is persisted between builds with the help of named volumes and each volume is namespaced by git branch name. Therefore one can create separate dev container environment specific to the current working git branch
- One can also create separate codespace for each branch by repeating above steps with the new chosen git branch
- The codespace shall automatically stop after 30 minutes of inactivity. One can manually stop and delete it using the VS code command panel

### Run and debug guide
Steps are common for both local and codespaces remote development
- Open the `Run and Debug` panel in VS Code and launch the following configurations:
  - **devcontainer: server**\
      It shall do the following operations:
    - Check availability of dependent docker containers
    - Migrate the migrations to the postgres database
    - Create a superuser as per the environment variables specified in `.env` file or use the default values
    - Run a background Django server on port `8080`, which serves the `opa` container
    - Start debug process for django server at port `7000`
    - Start debug process for a rq-worker process listening on all the queues
  - **devcontainer: ui**\
      It shall do the following operations:
    - Compile the node modules and keep the webpack-dev-server running in the background
    - Launch Chrome window in debug mode and open the CVAT web application running on port `3000`
  - **devcontainer: server: unit tests**\
      This launch config is used to run and debug python unit tests for the django apps and `cvat-cli`.
- One can debug the django code, rq-worker code and javascript code from the `devcontainer: django` and `devcontainer: rq worker`, `devcontainer: ui` panels in the debug console respectively
- After launching the `server` and ui `launch` configs, one should be able to log in to the `cvat` website running on the `localhost:3000` with username and password as `admin`

### Dev-Container Features
  - The dev container image is based on the official CVAT docker image at `cvat/server:dev` Upon every rebuild, the dev container shall try to pull the latest base image and therefore it will always have the latest upstream changes without any user intervention
  - The dev container pre-installs all the extensions specified in `devcontainer.json` file
  - The default python virtual environment contains packages installed from `testing.txt` requirements file which inherits `development`, `production` and `dataset_manifest` requirements files
  - Contains an additional python virtual environment for running `pytest`. It can be activated by selecting `/opt/venv-test/bin/python` in the `Python: Select interpreter` command pallette menu
  - All the python packages in the virtual environments as well node dependencies are updated when the container runs for the first time after rebuilding the container. This is done via the `postCreateCommand` specified in `devcontainer.json` file
  - Since the base image does not contain installation metadata for the `datumaro`, it clones the git repo every time the packages are updated; this takes a long time for the update to finish. To avoid this, its git commit_hash value from the base image is saved and used to check if an update is required
  - Pip cache is persisted between rebuilds
  - The default shell is `zsh`
  - The container user is `devcontainer` and it is a non-root user; however, one can access the root user via sudo without any password to perform root operations like installing development-specific applications
  - To permanently include an ubuntu package in the dev container such that all other users can access them, one can add it to apt package installation section in `.devcontainer/Dockerfile`, and rebuild the container
  - Additional python packages can be installed into the virtual environment by command `pip install`. They shall not persist between container builds; therefore, it is just useful for testing new packages. They can be made to persist by adding them to the requirements file and rebuilding the image
  - Git configurations on the host machine are mounted into the container. So things like `user.name` and `user.email` are already configured inside the container
  - SSH keys on the host machine are mounted into the container. So one should be able to use your GitHub ssh keys to access GitHub
  - `SQLTool` extension is pre-configured for the `cvat-db` database
  - Local terminal can be accessed from the dev container window by selecting `Terminal: Create New Integrated Terminal (Local)` from the command pallette. It can be used to run command on the host machine. It can be useful for accessing `docker` running on the host machine
  - Supports docker in docker to start and stop docker containers for running `pytest` tests and debug it without disturbing the main development containers and its ports
  - Serverless components can be deployed from within the dev container as per the documentation
  - User profile data including shell history are synced between the host and the container
  - Uses dependabot for creating automatic PRs for bumping dev container feature versions
  - It contains `OPA` and `nuctl` cli applications preinstalled

## Limitations
  - Cypress testing with browser is not supported in dev container and has to be run externally
  - In GitHub Codespaces, the recursive `chown` operation on an existing directory within the Dockerfile can be very slow, potentially delaying the initial build of the container.

## Native development guide
### Set up the dependencies:

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

