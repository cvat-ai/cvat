# Computer Vision Annotation Tool (CVAT)

[![Gitter chat](https://badges.gitter.im/opencv-cvat/gitter.png)](https://gitter.im/opencv-cvat)

CVAT is completely re-designed and re-implemented version of [Video Annotation Tool from Irvine, California](http://carlvondrick.com/vatic/) tool. It is free, online, interactive video and image annotation tool for computer vision. It is being used by our team to annotate million of objects with different properties. Many UI and UX decisions are based on feedbacks from professional data annotation team.

![CVAT screenshot](cvat/apps/documentation/static/documentation/images/cvat.jpg)

## Documentation

- [User's guide](cvat/apps/documentation/user_guide.md)
- [XML annotation format](cvat/apps/documentation/xml_format.md)
- [AWS Deployment Guide](cvat/apps/documentation/AWS-Deployment-Guide.md)
- [Questions](#questions)

## Screencasts

- [Annotation mode](https://youtu.be/6h7HxGL6Ct4)
- [Interpolation mode](https://youtu.be/U3MYDhESHo4)
- [Attribute mode](https://youtu.be/UPNfWl8Egd8)
- [Segmentation mode](https://youtu.be/6IJ0QN7PBKo)
- [Tutorial for polygons](https://www.youtube.com/watch?v=XTwfXDh4clI)

## LICENSE

Code released under the [MIT License](https://opensource.org/licenses/MIT).

## INSTALLATION

The instructions below should work for `Ubuntu 16.04`. It will probably work on other Operating Systems such as `Windows` and `macOS`, but may require minor modifications.

### Install [Docker CE](https://www.docker.com/community-edition) or [Docker EE](https://www.docker.com/enterprise-edition) from official site

Please read official manual [here](https://docs.docker.com/engine/installation/linux/docker-ce/ubuntu/).

### Install docker-compose (1.19.0 or newer)

```bash
sudo pip install docker-compose
```

### Build docker images

To build all necessary docker images run `docker-compose build` command. By default, in production mode the tool uses PostgreSQL as database, Redis for caching.

### Run docker containers

To start default container run `docker-compose up -d` command. Go to [localhost:8080](http://localhost:8080/). You should see a login page.

### You can include any additional components. Just add corresponding docker-compose file to build or run command:

```bash
# Build image with CUDA and OpenVINO support
docker-compose -f docker-compose.yml -f components/cuda/docker-compose.cuda.yml -f components/openvino/docker-compose.openvino.yml build

# Run containers with CUDA and OpenVINO support
docker-compose -f docker-compose.yml -f components/cuda/docker-compose.cuda.yml -f components/openvino/docker-compose.openvino.yml up -d
```

For details please see [components section](components/README.md).

### Create superuser account

You can [register a user](http://localhost:8080/auth/register) but by default it will not have rights even to view list of tasks. Thus you should create a superuser. The superuser can use admin panel to assign correct groups to the user. Please use the command below:

```bash
docker exec -it cvat bash -ic '/usr/bin/python3 ~/manage.py createsuperuser'
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

It is possible to proxy annotation logs from client to ELK. To do that run the following command below:

```bash
docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml up -d --build
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
      - cvat_share:/home/django/share:ro

volumes:
  cvat_share:
    driver_opts:
      type: none
      device: /mnt/share
      o: bind
```
You can change the share device path to your actual share. For user convenience we have defined the enviroment variable $CVAT_SHARE_URL. This variable contains a text (url for example) which will be being shown in the client-share browser.

## Questions

CVAT usage related questions or unclear concepts can be posted in our [Gitter chat](https://gitter.im/opencv-cvat) for **quick replies** from contributors and other users.

However, if you have a feature request or a bug report that can reproduced, feel free to open an issue (with steps to reproduce the bug if it's a bug report).

If you are not sure or just want to browse other users common questions, [Gitter chat](https://gitter.im/opencv-cvat) is the way to go.
