# Quick installation guide

Before you can use CVAT, you’ll need to get it installed. The document below
contains instructions for most popular operation systems. If your system is
not covered by the document it should be relatively straight forward to adapt
instructions below for other systems.

Probably you need to modify instructions below in case you behind a proxy
server. Proxy is an advanced topic and it is not covered by the guide.

## Ubuntu 18.04 (x86_64/amd64)
-   Open a terminal window. If you don't know how to open a terminal window on
    Ubuntu please read [the answer](https://askubuntu.com/questions/183775/how-do-i-open-a-terminal).

-   Type commands below into the terminal window to install `docker`. Complete
    instructions can be found [here](https://docs.docker.com/install/linux/docker-ce/ubuntu/).

    ```sh
    sudo apt-get update
    sudo apt-get install -y \
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
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    ```

-   Do [post-installation steps](https://docs.docker.com/install/linux/linux-postinstall/)
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
    sudo apt-get install -y python3-pip
    sudo pip3 install docker-compose
    ```

-   Clone _CVAT_ source code from public
    [GitHub repository](https://github.com/opencv/cvat).

    ```bash
    sudo apt-get install -y git
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
    list of tasks. Thus you should create a superuser. The superuser can use
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
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable
    ```

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press _Login_
    button. Now you should be able to create a new annotation task. Please read
    documentation about CVAT for more details.

## Windows 10
-   Download [Docker for Windows](download.docker.com/win/stable/Docker%20for%20Windows%20Installer.exe).
    Double-click `Docker for Windows Installer` to run the installer. Complete
    instructions can be found [here](https://docs.docker.com/docker-for-windows/install/). Note:
    Docker Desktop requires Windows 10 Pro or Enterprise version 14393 to run.

-   Download and install
    [Git for Windows](https://github.com/git-for-windows/git/releases/download/v2.21.0.windows.1/Git-2.21.0-64-bit.exe).
    When installing the package please keep all options by default.
    More information about the package can be found [here](https://gitforwindows.org).

-   Download and install [Google Chrome](https://www.google.com/chrome/). It is the only browser
    which is supported by CVAT.

-   Go to windows menu, find `Git Bash` application and run it. You should see a terminal window.

-   Clone _CVAT_ source code from public
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
    list of tasks. Thus you should create a superuser. The superuser can use
    admin panel to assign correct groups to the user. Please use the command
    below:

    ```sh
    winpty docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
    ```
    Choose login and password for your admin account. For more information
    please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press _Login_
    button. Now you should be able to create a new annotation task. Please read
    documentation about CVAT for more details.

## Mac OS Mojave
- Download [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg).
  Double-click Docker.dmg to open the installer, then drag Moby the whale
  to the Applications folder. Double-click Docker.app in the Applications
  folder to start Docker. Complete instructions can be found
  [here](https://docs.docker.com/v17.12/docker-for-mac/install/#install-and-run-docker-for-mac).
