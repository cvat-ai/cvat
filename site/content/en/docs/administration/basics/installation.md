<!--lint disable maximum-heading-length-->

---

title: 'Installation Guide'
linkTitle: 'Installation Guide'
weight: 1
description: 'A CVAT installation guide for different operating systems.'

---

<!--lint disable heading-style-->

# Quick installation guide

Before you can use CVAT, you’ll need to get it installed. The document below
contains instructions for the most popular operating systems. If your system is
not covered by the document it should be relatively straight forward to adapt
the instructions below for other systems.

Probably you need to modify the instructions below in case you are behind a proxy
server. Proxy is an advanced topic and it is not covered by the guide.

For access from China, read [sources for users from China](#sources-for-users-from-china) section.

## Ubuntu 18.04 (x86_64/amd64)

- Open a terminal window. If you don't know how to open a terminal window on
  Ubuntu please read [the answer](https://askubuntu.com/questions/183775/how-do-i-open-a-terminal).

- Type commands below into the terminal window to install `docker`. More
  instructions can be found [here](https://docs.docker.com/install/linux/docker-ce/ubuntu/).

  ```bash
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

- Perform [post-installation steps](https://docs.docker.com/install/linux/linux-postinstall/)
  to run docker without root permissions.

  ```bash
  sudo groupadd docker
  sudo usermod -aG docker $USER
  ```

  Log out and log back in (or reboot) so that your group membership is
  re-evaluated. You can type `groups` command in a terminal window after
  that and check if `docker` group is in its output.

- Install docker-compose (1.19.0 or newer). Compose is a tool for
  defining and running multi-container docker applications.

  ```bash
  sudo apt-get --no-install-recommends install -y python3-pip python3-setuptools
  sudo python3 -m pip install setuptools docker-compose
  ```

- Clone _CVAT_ source code from the
  [GitHub repository](https://github.com/opencv/cvat).

  ```bash
  sudo apt-get --no-install-recommends install -y git
  git clone https://github.com/opencv/cvat
  cd cvat
  ```
- To access CVAT over a network or through a different system, export `CVAT_HOST` environment variable

  ```bash
  export CVAT_HOST=your-ip-address
  ```

- Run docker containers. It will take some time to download the latest CVAT
  release and other required images like postgres, redis, etc. from DockerHub and create containers.

  ```bash
  docker-compose up -d
  ```

- Alternative: if you want to build the images locally with unreleased changes
  run the following command. It will take some time to build CVAT images.

  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
  docker-compose up -d
  ```

- You can register a user but by default it will not have rights even to view
  list of tasks. Thus you should create a superuser. A superuser can use an
  admin panel to assign correct groups to the user. Please use the command
  below:

  ```bash
  docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  Choose a username and a password for your admin account. For more information
  please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

- Google Chrome is the only browser which is supported by CVAT. You need to
  install it as well. Type commands below in a terminal window:

  ```bash
  curl https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
  sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
  sudo apt-get update
  sudo apt-get --no-install-recommends install -y google-chrome-stable
  ```

- Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
  Type your login/password for the superuser on the login page and press the _Login_
  button. Now you should be able to create a new annotation task. Please read the
  [CVAT manual](/docs/manual/) for more details.

## Windows 10

- Install WSL2 (Windows subsystem for Linux) refer to [this official guide](https://docs.microsoft.com/windows/wsl/install-win10).
  WSL2 requires Windows 10, version 2004 or higher. Note: You may not have to install a Linux distribution unless
  needed.

- Download and install [Docker Desktop for Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe).
  Double-click `Docker for Windows Installer` to run the installer.
  More instructions can be found [here](https://docs.docker.com/docker-for-windows/install/).
  Official guide for docker WSL2 backend can be found
  [here](https://docs.docker.com/docker-for-windows/wsl/). Note: Check that you are specifically using WSL2 backend
  for Docker.

- Download and install
  [Git for Windows](https://github.com/git-for-windows/git/releases/download/v2.21.0.windows.1/Git-2.21.0-64-bit.exe).
  When installing the package please keep all options by default.
  More information about the package can be found [here](https://gitforwindows.org).

- Download and install [Google Chrome](https://www.google.com/chrome/). It is the only browser
  which is supported by CVAT.

- Go to windows menu, find `Git Bash` application and run it. You should see a terminal window.

- Clone _CVAT_ source code from the
  [GitHub repository](https://github.com/opencv/cvat).

  ```bash
  git clone https://github.com/opencv/cvat
  cd cvat
  ```

- Run docker containers. It will take some time to download the latest CVAT
  release and other required images like postgres, redis, etc. from DockerHub and create containers.

  ```bash
  docker-compose up -d
  ```

- Alternative: if you want to build the images locally with unreleased changes
  run the following command. It will take some time to build CVAT images.

  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
  docker-compose up -d
  ```

- You can register a user but by default it will not have rights even to view
  list of tasks. Thus you should create a superuser. A superuser can use an
  admin panel to assign correct groups to other users. Please use the command
  below:

  ```bash
  winpty docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  If you don't have winpty installed or the above command does not work, you may also try the following:

  ```bash
  # enter docker image first
  docker exec -it cvat /bin/bash
  # then run
  python3 ~/manage.py createsuperuser
  ```

  Choose a username and a password for your admin account. For more information
  please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

- Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
  Type your login/password for the superuser on the login page and press the _Login_
  button. Now you should be able to create a new annotation task. Please read the
  [CVAT manual](/docs/manual/) for more details.

## Mac OS Mojave

- Download [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg).
  Double-click Docker.dmg to open the installer, then drag Moby the whale
  to the Applications folder. Double-click Docker.app in the Applications
  folder to start Docker. More instructions can be found
  [here](https://docs.docker.com/v17.12/docker-for-mac/install/#install-and-run-docker-for-mac).

- There are several ways to install Git on a Mac. The easiest is probably to
  install the Xcode Command Line Tools. On Mavericks (10.9) or above you can
  do this simply by trying to run git from the Terminal the very first time.

  ```bash
  git --version
  ```

  If you don’t have it installed already, it will prompt you to install it.
  More instructions can be found [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

- Download and install [Google Chrome](https://www.google.com/chrome/). It
  is the only browser which is supported by CVAT.

- Open a terminal window. The terminal app is in the Utilities folder in
  Applications. To open it, either open your Applications folder, then open
  Utilities and double-click on Terminal, or press Command - spacebar to
  launch Spotlight and type "Terminal," then double-click the search result.

- Clone _CVAT_ source code from the
  [GitHub repository](https://github.com/opencv/cvat).

  ```bash
  git clone https://github.com/opencv/cvat
  cd cvat
  ```

- Run docker containers. It will take some time to download the latest CVAT
  release and other required images like postgres, redis, etc. from DockerHub and create containers.

  ```bash
  docker-compose up -d
  ```

- Alternative: if you want to build the images locally with unreleased changes
  run the following command. It will take some time to build CVAT images.

  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
  docker-compose up -d
  ```

- You can register a user but by default it will not have rights even to view
  list of tasks. Thus you should create a superuser. A superuser can use an
  admin panel to assign correct groups to other users. Please use the command
  below:

  ```bash
  docker exec -it cvat bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  Choose a username and a password for your admin account. For more information
  please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

- Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
  Type your login/password for the superuser on the login page and press the _Login_
  button. Now you should be able to create a new annotation task. Please read the
  [CVAT manual](/docs/manual/) for more details.

## Advanced Topics

### Deploying CVAT behind a proxy

If you deploy CVAT behind a proxy and do not plan to use any of [serverless functions](#semi-automatic-and-automatic-annotation)
for automatic annotation, the exported environment variables
`http_proxy`, `https_proxy` and `no_proxy` should be enough to build images.
Otherwise please create or edit the file `~/.docker/config.json` in the home directory of the user
which starts containers and add JSON such as the following:

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy_server:port",
      "httpsProxy": "http://proxy_server:port",
      "noProxy": "*.test.example.com,.example2.com"
    }
  }
}
```

These environment variables are set automatically within any container.
Please see the [Docker documentation](https://docs.docker.com/network/proxy/) for more details.

### Using the Traefik dashboard

If you are customizing the docker compose files and you come upon some unexpected issues, using the Traefik
dashboard might be very useful to see if the problem is with Traefik configuration, or with some of the services.

You can enable the Traefik dashboard by uncommenting the following lines from `docker-compose.yml`

```yml
services:
  traefik:
    # Uncomment to get Traefik dashboard
    #   - "--entryPoints.dashboard.address=:8090"
    #   - "--api.dashboard=true"
    # labels:
    #   - traefik.enable=true
    #   - traefik.http.routers.dashboard.entrypoints=dashboard
    #   - traefik.http.routers.dashboard.service=api@internal
    #   - traefik.http.routers.dashboard.rule=Host(`${CVAT_HOST:-localhost}`)
```

and if you are using `docker-compose.https.yml`, also uncomment these lines
```yml
services:
  traefik:
    command:
      # Uncomment to get Traefik dashboard
      # - "--entryPoints.dashboard.address=:8090"
      # - "--api.dashboard=true"
```

Note that this "insecure" dashboard is not recommended in production (and if your instance is publicly available);
if you want to keep the dashboard in production you should read Traefik's
[documentation](https://doc.traefik.io/traefik/operations/dashboard/) on how to properly secure it.

### Additional components

- [Analytics: management and monitoring of data annotation team](/docs/administration/advanced/analytics/)

```bash
# Build and run containers with Analytics component support:
docker-compose -f docker-compose.yml \
  -f components/analytics/docker-compose.analytics.yml up -d --build
```

### Semi-automatic and automatic annotation

Please follow this [guide](/docs/administration/advanced/installation_automatic_annotation/).

### Stop all containers

The command below stops and removes containers, networks, volumes, and images
created by `up`.

```bash
docker-compose down
```

### Use your own domain

If you want to access your instance of CVAT outside of your localhost (on another domain),
you should specify the `CVAT_HOST` environment variable, like this:

```bash
export CVAT_HOST=<YOUR_DOMAIN>
```

### Share path

You can use a share storage for data uploading during you are creating a task.
To do that you can mount it to CVAT docker container. Example of
docker-compose.override.yml for this purpose:

```yml
version: '3.3'

services:
  cvat:
    environment:
      CVAT_SHARE_URL: 'Mounted from /mnt/share host directory'
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
we have defined the environment variable \$CVAT_SHARE_URL. This variable
contains a text (url for example) which is shown in the client-share browser.

You can [mount](/docs/administration/advanced/mounting_cloud_storages/)
your cloud storage as a FUSE and use it later as a share.

### Email verification

You can enable email verification for newly registered users.
Specify these options in the
[settings file](https://github.com/openvinotoolkit/cvat/blob/develop/cvat/settings/base.py) to configure Django allauth
to enable email verification (ACCOUNT_EMAIL_VERIFICATION = 'mandatory').
Access is denied until the user's email address is verified.

```python
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'

# Email backend settings for Django
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

Also you need to configure the Django email backend to send emails.
This depends on the email server you are using and is not covered in this tutorial, please see
[Django SMTP backend configuration](https://docs.djangoproject.com/en/3.1/topics/email/#django.core.mail.backends.smtp.EmailBackend)
for details.

### Deploy CVAT on the Scaleway public cloud

Please follow
[this tutorial](https://blog.scaleway.com/smart-data-annotation-for-your-computer-vision-projects-cvat-on-scaleway/)
to install and set up remote access to CVAT on a Scaleway cloud instance with data in a mounted object storage bucket.

### Deploy secure CVAT instance with HTTPS

Using Traefik, you can automatically obtain TLS certificate for your domain from Let's Encrypt,
enabling you to use HTTPS protocol to access your website.

To enable this, first set the the `CVAT_HOST` (the domain of your website) and `ACME_EMAIL`
(contact email for Let's Encrypt) environment variables:

```bash
export CVAT_HOST=<YOUR_DOMAIN>
export ACME_EMAIL=<YOUR_EMAIL>
```

Then, use the `docker-compose.https.yml` file to override the base `docker-compose.yml` file:

```bash
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

Then, the CVAT instance will be available at your domain on ports 443 (HTTPS) and 80 (HTTP, redirects to 443).

## Sources for users from China

If you stay in China, for installation you need to override the following sources.

- For use `apt update` using:

  [Ubuntu mirroring help](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)

  Pre-compiled packages:
  ```bash
  deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal main restricted universe multiverse
  deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-updates main restricted universe multiverse
  deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-backports main restricted universe multiverse
  deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-security main restricted universe multiverse
  ```
  Or source packages:
  ```bash
  deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal main restricted universe multiverse
  deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-updates main restricted universe multiverse
  deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-backports main restricted universe multiverse
  deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-security main restricted universe multiverse
  ```

- [Docker mirror station](https://www.daocloud.io/mirror)

  Add registry mirrors into `daemon.json` file:
  ```json
  {
      "registry-mirrors": [
          "http://f1361db2.m.daocloud.io",
          "https://docker.mirrors.ustc.edu.cn",
          "https://hub-mirror.c.163.com",
          "https://https://mirror.ccs.tencentyun.com",
          "https://mirror.ccs.tencentyun.com",
      ]
  }
  ```

- For using `pip`:

  [PyPI mirroring help](https://mirrors.tuna.tsinghua.edu.cn/help/pypi/)
  ```bash
  pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
  ```

- For using `npm`:

  [npm mirroring help](https://npmmirror.com/)
  ```bash
  npm config set registry https://registry.npm.taobao.org/
  ```

- Instead of `git` using [`gitee`](https://gitee.com/):

  [CVAT repository on gitee.com](https://gitee.com/monkeycc/cvat)

- For replace acceleration source `docker.com` run:
  ```bash
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  sudo add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) \
  ```

- For replace acceleration source `google.com` run:
  ```bash
  curl https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
  ```
