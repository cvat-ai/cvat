# Singularity User Guide

This is an example that uses [singularity-compose](https://www.github.com/singularityhub/singularity-compose) to bring up instances to run [opencv/cvat](https://github.com/opencv/cvat).

## Singularity Compose

First, make sure you have it installed.

```bash
$ pip install singularity-compose --user
```

Clone the repository

```bash
$ git clone https://github.com/opencv/cvat
$ cd cvat
```

## Containers

This application serves four Singularity containers:

 - cvatdb: is an instance of Docker `postgres:10-alpine`. You should set an environment `POSTGRES_USER` and `POSTGRES_DB` in the singularity-compose.yml. It will bind the cvatdb folder to `/var/lib/postgresql/data` in the container.
 - cvatredis: uses the Docker image `redis:4.0-alpine`
 - cvat: is a custom build from the Singularity recipe. It also has a set of environment variables in the singularity-compose.yml you should inspect. It mounts writable folders under "volumes."
 - cvatui: is another custom build from Singularity.ui that builds and serves a web application (exposes port 80).

Singularity doesn't [allow hostnames](https://github.com/sylabs/singularity/blob/8f0ea1f8116a96ae573b336352ceaa08f851af8a/internal/pkg/util/fs/files/hostname.go) with underscores, so as part of the container builds above, the hostnames are changes.
If you look in the [singularity-compose.yml](../../../singularity-compose.yml)
you'll notice these names used.

## Environment

Singularity doesn't support build arguments like Docker, so instead of
providing args in the singularity-compose.yaml file, we provide them in the 
Singularity recipe. The previously defined docker-compose environment variables
are also defined in the Singularity* files. Take a look at the `%environment` section and the top of
the `%post` section in each of Singularity.ui, Singularity.postgres, and Singularity 
to ensure that settings are as you would want. For example, in the Singularity recipe (builds cvat) you can enable or disable various plugins. Since %environment is not sourced during the build
phase (post) we have to duplicate variables in both places, unfortunately.
Thus, if you need to edit values, make sure to do so in both.

```bash
%environment
# These were previously Docker build args
export CUDA_SUPPORT="no"
export WITH_DEXTR="no"
export http_proxy=
export https_proxy=
export no_proxy=
export socks_proxy=
export TF_ANNOTATION="no"
export AUTO_SEGMENTATION="no"
export USER="django"
export DJANGO_CONFIGURATION="production"
export TZ="Etc/UTC"
export OPENVINO_TOOLKIT="no"
export TERM=xterm
export LANG='C.UTF-8'
export LC_ALL='C.UTF-8'
```

The creator of the Singularity recipes was not privy to which envars
are needed for only build, or both for build and runtime (note that Docker
`ENV` variables are present in both) and this is why this particular choice was made.
Without this second export, they would all be written to the $PWD. If you are
unable to use /tmp, or want to customize this behavior (or the number of processes)
you can of course change these variables before building.


## Build Containers

Once you are happy with environment variables (settings) you can build your
containers. Note that you'll need sudo (root permission) to do this, so likely you'll need to
build them off of a shared resource. If the resource supports it, you can also
try using Singularity `--fakeroot` ([docs here](https://sylabs.io/guides/3.5/user-guide/fakeroot.html)). That would look like this in the singularity-compose.yml file, for
each of the containers:

```yaml
build:
  context: .
  options:
    - fakeroot
```

When you are ready, build the containers:

```bash
$ singularity-compose build
```

You can also select to build a specific container:

```bash
$ singularity-compose build cvat
```

If you need to rebuild at any time, just delete the corresponding sif file 
and issue the build command again. Once you've built, you should see the containers 
`cvat.sif` and `cvatui.sif` in the present working directory, and a folder
with a corresponding image for each of `cvatredis`, and `cvatdb`.

### Start Container Instances

We can't keep any files in the directory for postgres, so it's not included in the
repository and you should make it.

```bash
mkdir -p volumes/db
```

Next, you can bring up the containers as instances.

```bash
$ singularity-compose up
Creating cvatdb
Creating cvatredis
Creating cvat
Creating cvatui
```

Check to see the containers running!

```bash
$ singularity-compose ps
INSTANCES  NAME PID     IMAGE
1          cvat	23038	cvat.sif
2        cvatdb	18716	cvatdb.sif
3     cvatredis	22865	cvatredis.sif
4        cvatui	23241	cvatui.sif
```

You can check that the server started by looking at the logs:

```bash
$ singularity-compose logs
```

And you should then be able to open your browser to [http://localhost:7080](http://localhost:7080) to see the application. When you are ready to bring down the application:

```bash
$ singularity-compose down
```

### Entrypoint

The previous entrypoint for the cvat container was to start the server
with supervisord, however that didn't work cleanly with Singularity because of
the rule "the user inside the container is the user outside the container."
So, given that you start as root (or with `--fakeroot`, as yourself) we
can't honor the USER directive in the Dockerfile to be the user "django."
For this reason, we currently have the entrypoint (called the `%startscript` section
in Singularity) as running a development server with:

```bash
python3 manage.py runserver 0.0.0.0:8080
```

This could be modified to either fix the supervisord deployment (likely
challenging) or use another method to keep the server running.

### Shell Inside

If you need to debug or otherwise inspect a container, you can shell inside:

```bash
$ singularity-compose shell cvat
```

### Cleaning Up

When you are finished, you can bring everything down:

```bash
$ singularity-compose down
Stopping (instance:cvat)
Stopping (instance:cvatui)
Stopping (instance:cvatdb)
Stopping (instance:cvatredis)
```
