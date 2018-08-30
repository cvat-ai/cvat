# Computer Vision Annotation Tool (CVAT)

CVAT is completely re-designed and re-implemented version of [Video Annotation Tool from Irvine, California](http://carlvondrick.com/vatic/) tool. It is free, online, interactive video and image annotation tool for computer vision. It is being used by our team to annotate million of objects with different properties. Many UI and UX decisions are based on feedbacks from professional data annotation team.

![CVAT screenshot](cvat/apps/documentation/static/documentation/images/gif003.gif)

## Documentation

- [User's guide](cvat/apps/documentation/user_guide.md)
- [XML annotation format](cvat/apps/documentation/xml_format.md)

## Screencasts

- [Annotation mode](https://www.youtube.com/watch?v=uSqaQENdyJE)
- [Interpolation mode](https://www.youtube.com/watch?v=sc5X5hvxNfA)
- [Attribute mode](https://www.youtube.com/watch?v=5yXaG0V7X0Q)

## LICENSE

Code released under the [MIT License](https://opensource.org/licenses/MIT).

## INSTALLATION

These instructions below should work for Ubuntu 16.04. Probably it will work on other OSes as well with minor modifications.

### Install [Docker CE](https://www.docker.com/community-edition) or [Docker EE](https://www.docker.com/enterprise-edition) from official site

Please read official manual [here](https://docs.docker.com/engine/installation/linux/docker-ce/ubuntu/).

### Install the latest driver for your graphics card

The step is necessary only to run tf_annotation app. If you don't have a Nvidia GPU you can skip the step.

```bash
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt-get update
sudo apt-cache search nvidia-*   # find latest nvidia driver
sudo apt-get install nvidia-*    # install the nvidia driver
sudo apt-get install mesa-common-dev
sudo apt-get install freeglut3-dev
sudo apt-get install nvidia-modprobe
```

Reboot your PC and verify installation by `nvidia-smi` command.

### Install [Nvidia-Docker](https://github.com/NVIDIA/nvidia-docker)

The step is necessary only to run tf_annotation app. If you don't have a Nvidia GPU you can skip the step. See detailed installation instructions on repository page.

### Install docker-compose (1.19.0 or newer)

```bash
sudo pip install docker-compose
```

### Build docker images

To build all necessary docker images run `docker-compose build` command. By default, in production mode the tool uses PostgreSQL as database, Redis for caching.

### Run containers without tf_annotation app

To start all containers run `docker-compose up -d` command. Go to [localhost:8080](http://localhost:8080/). You should see a login page.

### Run containers with tf_annotation app

If you would like to enable tf_annotation app first of all be sure that nvidia-driver, nvidia-docker and docker-compose>=1.19.0 are installed properly (see instructions above) and `docker info | grep 'Runtimes'` output contains `nvidia`.

Run following command:
```bash
docker-compose -f docker-compose.yml -f docker-compose.nvidia.yml up -d --build
```

### Create superuser account

You can [register a user](http://localhost:8080/auth/register) but by default it will not have rights even to view list of tasks. Thus you should create a superuser. The superuser can use admin panel to assign correct groups to the user. Please use the command below:

```bash
docker exec -it cvat sh -c '/usr/bin/python3 ~/manage.py createsuperuser'
```

Type your login/password for the superuser [on the login page](http://localhost:8080/auth/login) and press **Login** button. Now you should be able to create a new annotation task. Please read documentation for more details.

### Stop all containers

The command below will stop and remove containers, networks, volumes, and images
created by `up`.

```bash
docker-compose down
```

### Advanced settings

If you want to access you instance of CVAT outside of your localhost you should specify [ALLOWED_HOSTS](https://docs.djangoproject.com/en/2.0/ref/settings/#allowed-hosts) environment variable. The best way to do that is to create [docker-compose.override.yml](https://docs.docker.com/compose/extends/) and put all your extra settings here.

```yml
version: "2.3"

services:
  cvat:
    environment:
      ALLOWED_HOSTS: .example.com
    ports:
      - "80:8080"
```
### Annotation logs

It is possible to proxy annotation logs from client to another server over http. For examlpe you can use Logstash.
To do that set DJANGO_LOG_SERVER_URL environment variable in cvat section of docker-compose.yml
file (or add this variable to docker-compose.override.yml).

```yml
version: "2.3"

services:
cvat:
    environment:
      DJANGO_LOG_SERVER_URL: https://annotation.example.com:5000
```

### Share path

You can use a share storage for data uploading during you are creating a task. To do that you can mount it to CVAT docker container. Example of docker-compose.override.yml for this purpose:

```yml
version: "2.3"

services:
  cvat:
    environment:
      CVAT_SHARE_URL: "Mounted from /mnt/share host directory"
    volumes:
      cvat_share:/home/django/share:ro
      
volumes:
  cvat_share:
    driver_opts:
      type: none
      device: /mnt/share
      o: bind
```
You can change the share device path to your actual share. For user convenience we have defined the enviroment variable $CVAT_SHARE_URL. This variable contains a text (url for example) which will be being shown in the client-share browser. 
