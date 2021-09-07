---
title: 'Development environment'
linkTitle: 'Development environment'
weight: 2
description: 'Installing a development environment for different operating systems.'
---

- Install necessary dependencies:

  Ubuntu 18.04

  ```sh
  sudo apt-get update && sudo apt-get --no-install-recommends install -y build-essential curl redis-server python3-dev python3-pip python3-venv python3-tk libldap2-dev libsasl2-dev pkg-config libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libswresample-dev libavfilter-dev
  ```

  ```sh
  # Node and npm (you can use default versions of these packages from apt (8.*, 3.*), but we would recommend to use newer versions)
  curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

  MacOS 10.15

  ```sh
  brew install git python pyenv redis curl openssl node
  ```

- Install FFmpeg libraries (libav\*) version 4.0 or higher.

- Install [Visual Studio Code](https://code.visualstudio.com/docs/setup/linux#_debian-and-ubuntu-based-distributions)
  for development

- Install CVAT on your local host:

  ```sh
  git clone https://github.com/openvinotoolkit/cvat
  cd cvat && mkdir logs keys
  python3 -m venv .env
  . .env/bin/activate
  pip install -U pip wheel setuptools
  pip install -r cvat/requirements/development.txt
  python manage.py migrate
  python manage.py collectstatic
  ```

  > Note for Mac users
  >
  > If you have any problems with installing dependencies from
  > `cvat/requirements/*.txt`, you may need to reinstall your system python
  > In some cases after system update it can be configured incorrectly and cannot compile some native modules

- Create a super user for CVAT:

  ```sh
  $ python manage.py createsuperuser
  Username (leave blank to use 'django'): ***
  Email address: ***
  Password: ***
  Password (again): ***
  ```

- Install npm packages for UI and start UI debug server (run the following command from CVAT root directory):

  ```sh
  npm ci && \
  cd cvat-core && npm ci && \
  cd ../cvat-ui && npm ci && npm start
  ```

  > Note for Mac users
  >
  > If you faced with error
  >
  > `Node Sass does not yet support your current environment: OS X 64-bit with Unsupported runtime (57)`
  >
  > Read this article [Node Sass does not yet support your current environment](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)

- Open new terminal (Ctrl + Shift + T), run Visual Studio Code from the virtual environment

  ```sh
  cd .. && source .env/bin/activate && code
  ```

- Install following VS Code extensions:

  - [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
  - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
  - [vscode-remark-lint](https://marketplace.visualstudio.com/items?itemName=drewbourne.vscode-remark-lint)
  - [licenser](https://marketplace.visualstudio.com/items?itemName=ymotongpoo.licenser)
  - [Trailing Spaces](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)

- Reload Visual Studio Code from virtual environment

- Select `server: debug` configuration and start it (F5) to run REST server and its workers

You have done! Now it is possible to insert breakpoints and debug server and client of the tool.

## Note for Windows users

You develop CVAT under WSL (Windows subsystem for Linux) following next steps.

- Install WSL using [this guide](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

- Following this guide install Ubuntu 18.04 Linux distribution for WSL.

- Run Ubuntu using start menu link or execute next command

  ```powershell
  wsl -d Ubuntu-18.04
  ```

- Run all commands from this installation guide in WSL Ubuntu shell.
