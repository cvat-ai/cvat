- [Quick installation guide](#quick-installation-guide)
  - [Ubuntu 18.04 (x86_64/amd64)](#ubuntu-1804-x86_64amd64)
  - [Windows 10](#windows-10)
  - [Mac OS Mojave](#mac-os-mojave)
  - [Advanced topics](#advanced-topics)
    - [Additional components](#additional-components)
    - [Stop all containers](#stop-all-containers)
    - [Advanced settings](#advanced-settings)
    - [Share path](#share-path)

# Quick installation guide

Before you can use CVAT, you’ll need to get it installed. The document below
contains instructions for the most popular operating systems. If your system is
not covered by the document it should be relatively straight forward to adapt
the instructions below for other systems.

Probably you need to modify the instructions below in case you are behind a proxy
server. Proxy is an advanced topic and it is not covered by the guide.

## Ubuntu 18.04 (x86_64/amd64)
-   Open a terminal window. If you don't know how to open a terminal window on
    Ubuntu please read [the answer](https://askubuntu.com/questions/183775/how-do-i-open-a-terminal).

-   Type commands below into the terminal window to install `docker`. More
    instructions can be found [here](https://docs.docker.com/install/linux/docker-ce/ubuntu/).

    ```sh
    sudo apt-get update
    sudo apt-get --no-install-recommends install -y \
      apt-transport-https \
      ca-certificates \
      curl \
      gnupg-agent \
      software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository \
      "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) \
      stable"
    sudo apt-get update
    sudo apt-get --no-install-recommends install -y docker-ce docker-ce-cli containerd.io
    ```

-   Perform [post-installation steps](https://docs.docker.com/install/linux/linux-postinstall/)
    to run docker without root permissions.

    ```sh
    sudo groupadd docker
    sudo usermod -aG docker $USER
    ```
    Log out and log back in (or reboot) so that your group membership is
    re-evaluated. You can type `groups` command in a terminal window after
    that and check if `docker` group is in its output.

-   Install docker-compose (1.19.0 or newer). Compose is a tool for
    defining and running multi-container docker applications.

    ```bash
    sudo apt-get --no-install-recommends install -y python3-pip
    sudo python3 -m pip install docker-compose
    ```

-   Clone _CVAT_ source code from the
    [GitHub repository](https://github.com/opencv/cvat).

    ```bash
    sudo apt-get --no-install-recommends install -y git
    git clone https://github.com/opencv/cvat
    cd cvat
    ```

-   Build docker images by default. It will take some time to download public
    docker image ubuntu:16.04 and install all necessary ubuntu packages to run
    CVAT server.

    ```bash
    docker-compose build
    ```

-   Run docker containers. It will take some time to download public docker
    images like postgres:10.3-alpine, redis:4.0.5-alpine and create containers.

    ```sh
    docker-compose up -d
    ```

-   You can register a user but by default it will not have rights even to view
    list of tasks. Thus you should create a superuser. A superuser can use an
    admin panel to assign correct groups to the user. Please use the command
    below:

    ```sh
    docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
    ```
    Choose login and password for your admin account. For more information
    please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

-   Google Chrome is the only browser which is supported by CVAT. You need to
    install it as well. Type commands below in a terminal window:

    ```sh
    curl https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt-get update
    sudo apt-get --no-install-recommends install -y google-chrome-stable
    ```

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press the _Login_
    button. Now you should be able to create a new annotation task. Please read the
    [CVAT user's guide](/cvat/apps/documentation/user_guide.md) for more details.

## Windows 10
-   Download [Docker for Windows](https://download.docker.com/win/stable/Docker%20for%20Windows%20Installer.exe).
    Double-click `Docker for Windows Installer` to run the installer. More
    instructions can be found [here](https://docs.docker.com/docker-for-windows/install/). Note:
    Docker Desktop requires Windows 10 Pro or Enterprise version 14393 to run.

-   Download and install
    [Git for Windows](https://github.com/git-for-windows/git/releases/download/v2.21.0.windows.1/Git-2.21.0-64-bit.exe).
    When installing the package please keep all options by default.
    More information about the package can be found [here](https://gitforwindows.org).

-   Download and install [Google Chrome](https://www.google.com/chrome/). It is the only browser
    which is supported by CVAT.

-   Go to windows menu, find `Git Bash` application and run it. You should see a terminal window.

-   Clone _CVAT_ source code from the
    [GitHub repository](https://github.com/opencv/cvat).

    ```bash
    git clone https://github.com/opencv/cvat
    cd cvat
    ```

-   Build docker images by default. It will take some time to download public
    docker image ubuntu:16.04 and install all necessary ubuntu packages to run
    CVAT server.

    ```bash
    docker-compose build
    ```

-   Run docker containers. It will take some time to download public docker
    images like postgres:10.3-alpine, redis:4.0.5-alpine and create containers.

    ```sh
    docker-compose up -d
    ```

-   You can register a user but by default it will not have rights even to view
    list of tasks. Thus you should create a superuser. A superuser can use an
    admin panel to assign correct groups to other users. Please use the command
    below:

    ```sh
    winpty docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
    ```
    Choose login and password for your admin account. For more information
    please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press the _Login_
    button. Now you should be able to create a new annotation task. Please read the
    [CVAT user's guide](/cvat/apps/documentation/user_guide.md) for more details.

## Mac OS Mojave
-   Download [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg).
    Double-click Docker.dmg to open the installer, then drag Moby the whale
    to the Applications folder. Double-click Docker.app in the Applications
    folder to start Docker. More instructions can be found
    [here](https://docs.docker.com/v17.12/docker-for-mac/install/#install-and-run-docker-for-mac).

-   There are several ways to install Git on a Mac. The easiest is probably to
    install the Xcode Command Line Tools. On Mavericks (10.9) or above you can
    do this simply by trying to run git from the Terminal the very first time.

    ```bash
    git --version
    ```

    If you don’t have it installed already, it will prompt you to install it.
    More instructions can be found [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

-   Download and install [Google Chrome](https://www.google.com/chrome/). It
    is the only browser which is supported by CVAT.

-   Open a terminal window. The terminal app is in the Utilities folder in
    Applications. To open it, either open your Applications folder, then open
    Utilities and double-click on Terminal, or press Command - spacebar to
    launch Spotlight and type "Terminal," then double-click the search result.

-   Clone _CVAT_ source code from the
    [GitHub repository](https://github.com/opencv/cvat).

    ```bash
    git clone https://github.com/opencv/cvat
    cd cvat
    ```

-   Build docker images by default. It will take some time to download public
    docker image ubuntu:16.04 and install all necessary ubuntu packages to run
    CVAT server.

    ```bash
    docker-compose build
    ```

-   Run docker containers. It will take some time to download public docker
    images like postgres:10.3-alpine, redis:4.0.5-alpine and create containers.

    ```sh
    docker-compose up -d
    ```

-   You can register a user but by default it will not have rights even to view
    list of tasks. Thus you should create a superuser. A superuser can use an
    admin panel to assign correct groups to other users. Please use the command
    below:

    ```sh
    docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
    ```
    Choose login and password for your admin account. For more information
    please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press the _Login_
    button. Now you should be able to create a new annotation task. Please read the
    [CVAT user's guide](/cvat/apps/documentation/user_guide.md) for more details.

## Advanced topics

### Additional components

- [Auto annotation using DL models in OpenVINO toolkit format](/cvat/apps/auto_annotation/README.md)
- [Analytics: management and monitoring of data annotation team](/components/analytics/README.md)
- [TF Object Detection API: auto annotation](/components/tf_annotation/README.md)
- [Support for NVIDIA GPUs](/components/cuda/README.md)
- [Semi-automatic segmentation with Deep Extreme Cut](/cvat/apps/dextr_segmentation/README.md)
- [Auto segmentation: Keras+Tensorflow Mask R-CNN Segmentation](/components/auto_segmentation/README.md)

```bash
# Build and run containers with CUDA and OpenVINO support
# IMPORTANT: need to download OpenVINO package before running the command
docker-compose -f docker-compose.yml -f components/cuda/docker-compose.cuda.yml -f components/openvino/docker-compose.openvino.yml up -d --build

# Build and run containers with Analytics component support:
docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml up -d --build
```

### Stop all containers

The command below stops and removes containers, networks, volumes, and images
created by `up`.

```bash
docker-compose down
```

### Advanced settings

If you want to access your instance of CVAT outside of your localhost you should
specify the `CVAT_HOST` environment variable. The best way to do that is to create
[docker-compose.override.yml](https://docs.docker.com/compose/extends/) and put
all your extra settings here.

```yml
version: "2.3"

services:
  cvat_proxy:
    environment:
      CVAT_HOST: .example.com
```

Please don't forget include this file to docker-compose commands using the `-f`
option (in some cases it can be omitted).

### Share path

You can use a share storage for data uploading during you are creating a task.
To do that you can mount it to CVAT docker container. Example of
docker-compose.override.yml for this purpose:

```yml
version: "2.3"

services:
  cvat:
    environment:
      CVAT_SHARE_URL: "Mounted from /mnt/share host directory"
    volumes:
      - cvat_share:/home/django/share:ro

volumes:
  cvat_share:
    driver_opts:
      type: none
      device: /mnt/share
      o: bind
```

You can change the share device path to your actual share. For user convenience
we have defined the environment variable $CVAT_SHARE_URL. This variable
contains a text (url for example) which is shown in the client-share browser.
