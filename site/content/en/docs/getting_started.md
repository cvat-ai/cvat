---
title: 'Getting started'
linkTitle: 'Getting started'
weight: 1
---

To install and set up CVAT:

1. Install CVAT
1. Create a superuser
1. Creat a task
1. Create an annotation
1. Export dataset
1. See also

## Install CVAT

{{< tabpane >}}
  {{< tab header="Ubuntu" >}}
  1. Open a [terminal window](https://askubuntu.com/questions/183775/how-do-i-open-a-terminal).
2. Install `docker`.

  ```shell
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
More instructions can be found [here](https://docs.docker.com/install/linux/docker-ce/ubuntu/).
3. Perform [post-installation steps](https://docs.docker.com/install/linux/linux-postinstall/) to run docker without root permissions.

  ```shell
  sudo groupadd docker
  sudo usermod -aG docker $USER
  ```

  Log out and log back in (or reboot) so that your group membership is
  re-evaluated. Type `groups` command in a terminal window after
  that and check if `docker` group is in its output.

4. Install `docker-compose` (1.19.0 or newer).
  ```shell
  sudo apt-get --no-install-recommends install -y python3-pip python3-setuptools
  sudo python3 -m pip install setuptools docker-compose
  ```

5. Clone _CVAT_ source code from the
  [GitHub repository](https://github.com/opencv/cvat) with Git.

6. Clone latest _develop_ branch:
  ```shell
  git clone https://github.com/opencv/cvat
  cd cvat
  ```

  See [alternatives](#how-to-get-cvat-source-code) if you want to download one of the release
  versions or use the `wget` or `curl` tools.

7. To access CVAT over a network or through a different system, export `CVAT_HOST` environment variable.

  ```shell
  export CVAT_HOST=your-ip-address
  ```

8. Run docker containers.

  ```shell
  docker-compose up -d
  ```

9. (Optional) Use the `CVAT_VERSION` environment variable to specify the version of CVAT you want to
  install (e.g `v2.1.0`, `dev`).
  By default the `dev` images are pulled for the _develop_ branch,
  and corresponding release images for the release versions.
  ```shell
  CVAT_VERSION=dev docker-compose up -d
  ```

>[Building the images locally with unreleased changes](#how-to-pullbuildupdate-cvat-images)

10. Create a superuser. A superuser can use an admin panel to assign correct groups to a user.

  ```shell
  docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  Choose a username and a password for your admin account. For more information read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

11. Install **Google Chrome** as it is the only browser which is supported by CVAT.

  ```shell
  curl https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
  sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
  sudo apt-get update
  sudo apt-get --no-install-recommends install -y google-chrome-stable
  ```

12. Open Google Chrome browser and go to [localhost:8080](http://localhost:8080).
13. Log in as the superuser. Now you can create a new annotation task.
  {{< /tab >}}
  {{< tab header="Windows" >}}
   1. [Install](https://docs.microsoft.com/windows/wsl/install-win10) WSL2 (Windows subsystem for Linux).
  > WSL2 requires Windows 10, version 2004 or higher.
  > You may not have to install a Linux distribution unless needed.

2. Download and install [Docker Desktop for Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe).
  * [More instructions](https://docs.docker.com/docker-for-windows/install/).
  * [Official guide for docker WSL2 backend](https://docs.docker.com/docker-for-windows/wsl/).
 
 >  Check that you are specifically using WSL2 backend for Docker.

3. Download and install [Git for Windows](https://github.com/git-for-windows/git/releases/download/v2.21.0.windows.1/Git-2.21.0-64-bit.exe).
  When installing the package, keep all options by default.
  [More information about the package](https://gitforwindows.org).

4. Download and install [Google Chrome](https://www.google.com/chrome/). It is the only browser which is supported by CVAT.

5. Open the _Git Bash_ application.

6. Clone _CVAT_ source code from the [GitHub repository](https://github.com/opencv/cvat).

7. Clone the latest _develop_ branch:
  ```shell
  git clone https://github.com/opencv/cvat
  cd cvat
  ```

  See [alternatives](#how-to-get-cvat-source-code) if you want to download one of the release
  versions.

8. Run the `docker` containers.

  ```shell
  docker-compose up -d
  ```

9. (Optional) Use `CVAT_VERSION` environment variable to specify the version of CVAT you want to install (e.g `v2.1.0`, `dev`).
  By default `dev` images will be pulled for develop branch, and corresponding release images for release versions.

  ```shell
  CVAT_VERSION=dev docker-compose up -d
  ```

> [Building the images locally with unreleased changes](#how-to-pullbuildupdate-cvat-images)

10. Create a superuser. A superuser can use an admin panel to assign correct groups to a user.

  ```shell
  winpty docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  If you don't have `winpty` installed or the above command does not work, you may also try the following:

  ```shell
  # enter docker image first
  docker exec -it cvat_server /bin/bash
  # then run
  python3 ~/manage.py createsuperuser
  ```

  Choose a username and a password for your admin account. For more information read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

11. Open Google Chrome browser and go to [localhost:8080](http://localhost:8080).
12. Log in as the superuser. Now you can create a new annotation task.
  {{< /tab >}}
  {{< tab header="Mac OS" >}}
    1. Download [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg).
  
  [More instructions](https://docs.docker.com/v17.12/docker-for-mac/install/#install-and-run-docker-for-mac).

2. Install the _Xcode Command Line Tools_. On Mavericks (10.9) or above run `git` from **Terminal**.

  ```shell
  git --version
  ```

  If you don’t have it installed already, it will prompt you to install it.
  [More instructions](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

3. Download and install [Google Chrome](https://www.google.com/chrome/), as it is the only browser supported by CVAT.

4. Open **Terminal**.

5. Clone _CVAT_ source code from the [GitHub repository](https://github.com/opencv/cvat) with Git.

  Clone the latest _develop_ branch:
  ```shell
  git clone https://github.com/opencv/cvat
  cd cvat
  ```
  See [alternatives](#how-to-get-cvat-source-code) if you want to download one of the release
  versions or use the `wget` or `curl` tools.

6. Run the `docker` containers.

  ```shell
  docker-compose up -d
  ```

7. (Optional) Use `CVAT_VERSION` environment variable to specify the version of CVAT you want to install (e.g `v2.1.0`, `dev`).
  By default the `dev` images are pulled for develop branch, and corresponding release images for release versions.

  ```shell
  CVAT_VERSION=dev docker-compose up -d
  ```

> [Building the images locally with unreleased changes](#how-to-pullbuildupdate-cvat-images)

8. Create a superuser. A superuser can use an admin panel to assign correct groups to a user.

  ```shell
  docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

  Choose a username and a password for your admin account. For more information read [Django documentation](https://docs.djangoproject.com/en/2.2/ref/django-admin/#createsuperuser).

9. Open Google Chrome browser and go to [localhost:8080](http://localhost:8080).
10. Log in as the superuser. Now you can create a new annotation task.

  {{< /tab >}}
{{< /tabpane >}}

## Create a superuser

1. Open [authorization page](https://app.cvat.ai/auth/login).
1. Log in or create an account.
1. Create a superuser account:

  ```bash
    docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

1. Modify permissions for the new user in the [Django administration panel](http://localhost:8080/admin). There are several groups:
* **admin** — _here goes some info about this role and why a user may need it_;
* **user** — _here goes some info about this role and why a user may need it_;
* **annotator** — _here goes some info about this role and why a user may need it_;
* **observer** — _here goes some info about this role and why a user may need it_.

### Administration panel

Use the [Django administration panel](http://localhost:8080/admin) to:

* create a user;
* edit a user;
* delete a user;
* control permissions and access to the tool.

  ![](/images/image115.jpg)




## Create a task

1. Open the **Tasks** section.
1. Click **Create new task**.
1. Set the name of the task.
1. Set the label:

    4.1. Click **Add label**;
  
    4.2. Enter the name;
   
    4.3. Choose the color.
1. Drag and drop images or videos for the annotation.

## Annotation

### Basic

1. Click **Open task**.
1. Choose a job in the jobs list.
1. Choose a correct section for the type of the task.
1. Start annotation.

| Shape     | Annotation                                                                                 | Interpolation                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Rectangle | [Shape mode (basics)](/docs/manual/basics/shape-mode-basics/)                              | [Track mode (basics)](/docs/manual/basics/track-mode-basics/)                                                          |
| Polygon   | [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/)                | [Track mode with polygons](/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons/)                   |
| Polyline  | [Annotation with polylines](/docs/manual/advanced/annotation-with-polylines/)              |                                                                                                                        |
| Points    | [Points in shape mode](/docs/manual/advanced/annotation-with-points/points-in-shape-mode/) | [Liner interpolation with one point](/docs/manual/advanced/annotation-with-points/liner-interpolation-with-one-point/) |
| Cuboids   | [Annotation with cuboids](/docs/manual/advanced/annotation-with-cuboids/)                  | [Editing the cuboid](/docs/manual/advanced/annotation-with-cuboids/editing-the-cuboid/)                                |
| Tag       | [Annotation with tags](/docs/manual/advanced/annotation-with-tags/)                        |                                                                                                                        |

### Advanced

In CVAT there is the possibility of using automatic and semi-automatic annotation what gives you the opportunity to speed up the execution of the annotation:

- [OpenCV tools](/docs/manual/advanced/opencv-tools/) - tools included in CVAT by default.
- [AI tools](/docs/manual/advanced/ai-tools/) - tools requiring installation.
- [Automatic annotation](/docs/manual/advanced/automatic-annotation/) - automatic annotation with using DL models.

## Export dataset

![](/images/image028.jpg)

1. Click **Save** or press _Ctrl+S_.
1. Click **Menu**.
1. Click **Export dataset**.
1. Choose a format of the dataset from the [list of supported formats](/docs/manual/advanced/formats/).


## See also
  *  [Export and import datasets](../docs/manual/advanced/export-import-datasets.md)
  *  [Creating an annotation task](../docs/manual/basics/creating_an_annotation_task.md)
