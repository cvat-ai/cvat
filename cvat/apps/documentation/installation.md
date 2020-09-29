- [Quick installation guide](#quick-installation-guide)
  - [Ubuntu 18.04 (x86_64/amd64)](#ubuntu-1804-x86_64amd64)
  - [Windows 10](#windows-10)
  - [Mac OS Mojave](#mac-os-mojave)
  - [Advanced Topics](#advanced-topics)
    - [Deploying CVAT behind a proxy](#deploying-cvat-behind-a-proxy)
    - [Additional components](#additional-components)
    - [Semi-automatic and automatic annotation](#semi-automatic-and-automatic-annotation)
    - [Stop all containers](#stop-all-containers)
    - [Advanced settings](#advanced-settings)
    - [Share path](#share-path)
    - [Email verification](#email-verification)
    - [Serving over HTTPS](#serving-over-https)
      - [Prerequisites](#prerequisites)
      - [Roadmap](#roadmap)
      - [Step-by-step instructions](#step-by-step-instructions)
        - [1. Make the proxy listen on standard port 80 and prepare nginx for the ACME challenge via webroot method](#1-make-the-proxy-listen-on-standard-port-80-and-prepare-nginx-for-the-acme-challenge-via-webroot-method)
        - [2. Setting up HTTPS with `acme.sh` helper](#2-setting-up-https-with-acmesh-helper)
          - [Create certificate files using an ACME challenge on docker host](#create-certificate-files-using-an-acme-challenge-on-docker-host)

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
    sudo apt-get --no-install-recommends install -y python3-pip python3-setuptools
    sudo python3 -m pip install setuptools docker-compose
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
    Choose a username and a password for your admin account. For more information
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
-   Install WSL2 (Windows subsystem for Linux) refer to [this official guide](https://docs.microsoft.com/windows/wsl/install-win10).
    WSL2 requires Windows 10, version 2004 or higher. Note: You may not have to install a Linux distribution unless
     needed.

-   Download and install [Docker Desktop for Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe).
    Double-click `Docker for Windows Installer` to run the installer.
    More instructions can be found [here](https://docs.docker.com/docker-for-windows/install/).
    Official guide for docker WSL2 backend can be found
    [here](https://docs.docker.com/docker-for-windows/wsl/). Note: Check that you are specifically using WSL2 backend
     for Docker.

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
    Choose a username and a password for your admin account. For more information
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
    Choose a username and a password for your admin account. For more information
    please read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

-   Open the installed Google Chrome browser and go to [localhost:8080](http://localhost:8080).
    Type your login/password for the superuser on the login page and press the _Login_
    button. Now you should be able to create a new annotation task. Please read the
    [CVAT user's guide](/cvat/apps/documentation/user_guide.md) for more details.

## Advanced Topics

### Deploying CVAT behind a proxy
If you deploy CVAT behind a proxy and do not plan to use any of [serverless functions](#semi-automatic-and-automatic-annotation)
for automatic annotation, the exported environment variables
`http_proxy`, `https_proxy` and `no_proxy` should be enough to build images.
Otherwise please create or edit the file `~/.docker/config.json` in the home directory of the user
which starts containers and add JSON such as the following:
```json
{
 "proxies":
 {
   "default":
   {
     "httpProxy": "http://proxy_server:port",
     "httpsProxy": "http://proxy_server:port",
     "noProxy": "*.test.example.com,.example2.com"
   }
 }
}
```
These environment variables are set automatically within any container.
Please see the [Docker documentation](https://docs.docker.com/network/proxy/) for more details.

### Additional components

- [Analytics: management and monitoring of data annotation team](/components/analytics/README.md)

```bash
# Build and run containers with Analytics component support:
docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml up -d --build
```

### Semi-automatic and automatic annotation

- You have to install `nuctl` command line tool to build and deploy serverless
functions. Download [the latest release](https://github.com/nuclio/nuclio/releases).
- Create `cvat` project inside nuclio dashboard where you will deploy new
serverless functions and deploy a couple of DL models. Commands below should
be run only after CVAT has been installed using docker-compose because it
runs nuclio dashboard which manages all serverless functions.

```bash
nuctl create project cvat
```

```bash
nuctl deploy --project-name cvat \
    --path serverless/openvino/dextr/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local
```

```bash
nuctl deploy --project-name cvat \
    --path serverless/openvino/omz/public/yolo-v3-tf/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local
```

Note: see [deploy.sh](/serverless/deploy.sh) script for more examples.

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

### Email verification

You can enable email verification for newly registered users.
Specify these options in the [settings file](../../settings/base.py) to configure Django allauth
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

### Serving over HTTPS

We will add [letsencrypt.org](https://letsencrypt.org/) issued certificate to secure
our server connection.

#### Prerequisites

We assume that

- you have sudo access on your server machine,
- you have an IP address to use for remote access, and
- that the local CVAT installation works on your server.

If this is not the case, please complete the steps in the installation manual first.

#### Roadmap

We will go through the following sequence of steps to get CVAT over HTTPS:

- Setup containers on default 80/tcp port. Checkin and then down the containers.
- Configure Nginx to pass one of the [ACME challenges](https://letsencrypt.org/docs/challenge-types/) - webroot.
- Create the certificate files using [acme.sh](https://github.com/acmesh-official/acme.sh).
- Reconfigure Nginx to serve over HTTPS and map CVAT to Docker Compose port 443.

#### Step-by-step instructions

##### 1. Make the proxy listen on standard port 80 and prepare nginx for the ACME challenge via webroot method

> The configuration assumes that on the docker host there will be only one instance of the CVAT site listens for incoming connections on 80 and 443 port. Also redirecting everything that does not concern renewal of certificates to the site via secure HTTPS protocol.

Let's assume the server will be at `my-cvat-server.org`.

Point you shell in cvat repository directory, usually `cd $HOME/cvat`:

Add the following into your `docker-compose.override.yml`, replacing `my-cvat-server.org` with your own IP address. This file lives in the same directory as `docker-compose.yml`.

Create the required directories for letsencrypt webroot operation and acme folder passthrough.

Now restart the containers with new configurations updated in `docker-compose.override.yml`

```bash
# on the docker host

# this will create ~/.acme.sh directory
curl https://get.acme.sh | sh

# create a subdirs for acme-challenge webroot manually
mkdir -p $HOME/cvat/letsencrypt-webroot/.well-known/acme-challenge
```

```yaml
# docker-compose.override.yml
version: "2.3"

services:
  cvat_proxy:
    environment:
      CVAT_HOST: my-cvat-server.org
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./letsencrypt-webroot:/var/tmp/letsencrypt-webroot
      - /root/.acme.sh:/root/.acme.sh

  cvat:
    environment:
      ALLOWED_HOSTS: '*'
```

This will enable serving `http://my-cvat-server.org/.well-known/acme-challenge/`
route from `/var/tmp/letsencrypt-webroot` directory on the container's filesystem which is bind mounted from docker host `$HOME/cvat/letsencrypt-webroot`. That volume needed for issue and renewing certificates only.

Update a CVAT site proxy template `$HOME/cvat/cvat_proxy/conf.d/cvat.conf.template` on docker(system) host. Site config updates from this template each time `cvat_proxy` container start.

Add a location to server with `server_name ${CVAT_HOST};` ahead others:

```
    location ^~ /.well-known/acme-challenge/ {
      default_type "text/plain";
      root /var/tmp/letsencrypt-webroot;
    }
```
You can use the [Nginx quickstart guide](http://nginx.org/en/docs/beginners_guide.html) for reference.


```bash
# on the docker host
docker-compose down
docker-compose up -d
```

Your server should still be visible (and unsecured) at `http://my-cvat-server.org`
but you won't see any behavior changes.

At this point your deployment is up and running, ready for run acme-challenge.

##### 2. Setting up HTTPS with `acme.sh` helper

There are multiple approaches. First one is to use helper on docker host.

In a our approach
* it is easier to setup automatic certificate updates and (than it can be done in the container).
* leave certificates in safe place on docker host (protect from `docker-compose down` cleanup)
* no unnecessary certificate files copying between container and host.

###### Create certificate files using an ACME challenge on docker host

**Prepare certificates.**

Point you shell in cvat repository directory, usually `cd $HOME/cvat` on docker host.

> Certificate issue and updates should be on docker host in this approach.

Let’s Encrypt provides rate limits to ensure fair usage by as many people as possible. They recommend utilize their staging environment instead of the production API during testing. So first try to get a test certificate.

```
~/.acme.sh/acme.sh --issue --staging -d my-cvat-server.org -w $HOME/cvat/letsencrypt-webroot --debug
```

> Debug note: nginx server logs for cvat_proxy are not saved in container. You shall see it at docker host by with: `docker logs cvat_proxy`.

If certificates is issued a successful we should test a renew:

```
~/.acme.sh/acme.sh --renew --force --staging -d my-cvat-server.org -w $HOME/cvat/letsencrypt-webroot --debug
```
If success:

* remove test certificate
* issue a production certificate
* create a cron job for user (`crontab -e`).

```
~/.acme.sh/acme.sh --remove -d my-cvat-server.org --debug
rm -r /root/.acme.sh/my-cvat-server.org

~/.acme.sh/acme.sh --issue -d my-cvat-server.org -w $HOME/cvat/letsencrypt-webroot --debug

~/.acme.sh/acme.sh --install-cronjob
```

Down the cvat_proxy container for setup https with issued certificates.

```bash
docker stop cvat_proxy
```

**Reconfigure nginx for use certificates.**

Bring the configuration file `$HOME/cvat/cvat_proxy/conf.d/cvat.conf.template` to the following form:

* add location with redirect `return 301` to 80/tcp server.
* change listen to `listen 443 ssl;` in main configururation server
* add ssl certificates options and secure them.

Example of configuration file:

```
server {
    listen       80;
    server_name  _ default;
    return       404;
}

server {
    listen       80;
    server_name  ${CVAT_HOST};

    location ^~ /.well-known/acme-challenge/ {
      default_type "text/plain";
      root /var/tmp/letsencrypt;
    }

    location / {
      return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl;
    ssl_certificate /root/.acme.sh/my-cvat-server.org/my-cvat-server.org.cer;
    ssl_certificate_key /root/.acme.sh/my-cvat-server.org/my-cvat-server.org.key;
    ssl_trusted_certificate /root/.acme.sh/my-cvat-server.org/fullchain.cer;

    # security options
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;
    ssl_stapling on;
    ssl_session_timeout 24h;
    ssl_session_cache shared:SSL:2m;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!3DES';

    # security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    server_name  ${CVAT_HOST};

    proxy_pass_header       X-CSRFToken;
    proxy_set_header        Host $http_host;
    proxy_pass_header       Set-Cookie;

    location ~* /api/.*|git/.*|analytics/.*|static/.*|admin(?:/(.*))?.*|documentation/.*|django-rq(?:/(.*))? {
        proxy_pass              http://cvat:8080;
    }

    location / {
        proxy_pass              http://cvat_ui;
    }
}
```

Start cvat_proxy container with https enabled.

```bash
docker start cvat_proxy
```
