---
title: 'Development environment'
linkTitle: 'Development environment'
weight: 2
description: 'Installing a development environment for different operating systems.'
---
### Setup the dependencies:

- Install necessary dependencies:

  Ubuntu 18.04

  ```bash
  sudo apt-get update && sudo apt-get --no-install-recommends install -y build-essential curl git redis-server python3-dev python3-pip python3-venv python3-tk libldap2-dev libsasl2-dev pkg-config libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libswresample-dev libavfilter-dev
  ```

  ```bash
  # Install Node.js 16
  curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

  MacOS 10.15

  ```bash
  brew install git python pyenv redis curl openssl node
  ```

- Install Chrome

- Install FFmpeg libraries (libav\*) version 4.0 or higher.

- Install [VS Code](https://code.visualstudio.com/docs/setup/linux#_debian-and-ubuntu-based-distributions).

- Install the following VScode extensions:

  - [JavaScript Debugger](https://marketplace.visualstudio.com/items?itemName=ms-vscode.js-debug)
  - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
  - [vscode-remark-lint](https://marketplace.visualstudio.com/items?itemName=drewbourne.vscode-remark-lint)
  - [licenser](https://marketplace.visualstudio.com/items?itemName=ymotongpoo.licenser)
  - [Trailing Spaces](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)


- Install CVAT on your local host:

  ```bash
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

  ```bash
  python manage.py createsuperuser
  ```

- Install npm packages for UI (run the following command from CVAT root directory):

  ```bash
  npm ci
  ```

  > Note for Mac users
  >
  > If you faced with error
  >
  > `Node Sass does not yet support your current environment: OS X 64-bit with Unsupported runtime (57)`
  >
  > Read this article [Node Sass does not yet support your current environment](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)

- Install [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and [Docker-Compose](https://docs.docker.com/compose/install/)

- Pull OpenPolicyAgent Docker-image (run from CVAT root dir):

  ```bash
  sudo docker-compose -f docker-compose.yml -f docker-compose.dev.yml up cvat_opa
  ```

### Run CVAT
- Start npm UI debug server (run the following command from CVAT root directory):
  - If you want to run CVAT in localhost:
    ```sh
    npm run start:cvat-ui
     ```
  - If you want to access CVAT from outside of your host:
    ```sh
    CVAT_UI_HOST='<YOUR_HOST_IP>' npm run start:cvat-ui
    ```
- Open a new terminal window.
- Run VScode from the virtual environment (run the following command from CVAT root directory):

  ```sh
  source .env/bin/activate && code
  ```

- Inside VScode, Open CVAT root dir

- Select `server: debug` configuration and run it (F5) to run REST server and its workers
- Make sure that ```Uncaught Exceptions``` option under breakpoints section is unchecked
- If you choose to run CVAT in localhost: Select `server: chrome` configuration and run it (F5) to open CVAT in Chrome
- Alternative: If you changed CVAT_UI_HOST just enter ```<YOUR_HOST_IP>:3000``` in your browser.


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
- You might have to manually start the redis server in wsl before you can start the configuration inside
  Visual Studio Code. You can do this with `sudo service redis-server start`. Alternatively you can also
  use a redis docker image instead of using the redis-server locally.
