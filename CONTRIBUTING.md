# Contributing to this project

Please take a moment to review this document in order to make the contribution
process easy and effective for everyone involved.

Following these guidelines helps to communicate that you respect the time of
the developers managing and developing this open source project. In return,
they should reciprocate that respect in addressing your issue or assessing
patches and features.

## Development environment

Next steps should work on clear Ubuntu 18.04.

- Install necessary dependencies:

```sh
$ sudo apt-get update && sudo apt-get --no-install-recommends install -y ffmpeg build-essential nodejs npm curl redis-server python3-dev python3-pip python3-venv libldap2-dev libsasl2-dev
```

-   Install [Visual Studio Code](https://code.visualstudio.com/docs/setup/linux#_debian-and-ubuntu-based-distributions)
for development

-   Install CVAT on your local host:

```sh
git clone https://github.com/opencv/cvat
cd cvat && mkdir logs keys
python3 -m venv .env
. .env/bin/activate
pip install -U pip wheel setuptools
pip install -r cvat/requirements/development.txt
pip install -r datumaro/requirements.txt
python manage.py migrate
python manage.py collectstatic
```

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
npm install && \
cd cvat-core && npm install && \
cd ../cvat-canvas && npm install && \
cd ../cvat-ui && npm install && npm start
```

- Open new terminal (Ctrl + Shift + T), run Visual Studio Code from the virtual environment

```sh
 cd .. && source .env/bin/activate && code
```

-   Install followig vscode extensions:
    - [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
    - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
    - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
    - [vscode-remark-lint](https://marketplace.visualstudio.com/items?itemName=drewbourne.vscode-remark-lint)
    - [licenser](https://marketplace.visualstudio.com/items?itemName=ymotongpoo.licenser)

-   Reload Visual Studio Code from virtual environment

-   Select `server: debug` configuration and start it (F5) to run REST server and its workers

You have done! Now it is possible to insert breakpoints and debug server and client of the tool.

## How to setup additional components in development environment

### Automatic annotation
- Install OpenVINO on your host machine according to instructions from
[OpenVINO website](https://docs.openvinotoolkit.org/latest/index.html)
- Add some environment variables (copy code below to the end of ``.env/bin/activate`` file):
```sh
    source /opt/intel/openvino/bin/setupvars.sh

    export OPENVINO_TOOLKIT="yes"
    export IE_PLUGINS_PATH="/opt/intel/openvino/deployment_tools/inference_engine/lib/intel64"
    export OpenCV_DIR="/usr/local/lib/cmake/opencv4"
    export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:/opt/intel/openvino/inference_engine/lib/intel64"
```

Notice 1: be sure that these paths actually exist. Some of them can differ in different OpenVINO versions.

Notice 2: you need to deactivate, activate again and restart vs code
to changes in ``.env/bin/activate`` file are active.

### ReID algorithm
- Perform all steps in the automatic annotation section
- Download ReID model and save it somewhere:
```sh
    curl https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.xml -o reid.xml
    curl https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.bin -o reid.bin
```
- Add next line to ``.env/bin/activate``:
```sh
    export REID_MODEL_DIR="/path/to/dir" # dir must contain .xml and .bin files
```

### Deep Extreme Cut
- Perform all steps in the automatic annotation section
- Download Deep Extreme Cut model, unpack it, and save somewhere:
```sh
curl https://download.01.org/openvinotoolkit/models_contrib/cvat/dextr_model_v1.zip -o dextr.zip
unzip dextr.zip
```
- Add next lines to ``.env/bin/activate``:
```sh
    export WITH_DEXTR="yes"
    export DEXTR_MODEL_DIR="/path/to/dir" # dir must contain .xml and .bin files
```

### Tensorflow RCNN
- Download RCNN model, unpack it, and save it somewhere:
```sh
curl http://download.tensorflow.org/models/object_detection/faster_rcnn_inception_resnet_v2_atrous_coco_2018_01_28.tar.gz -o model.tar.gz && \
tar -xzf model.tar.gz
```
- Add next lines to ``.env/bin/activate``:
```sh
    export TF_ANNOTATION="yes"
    export TF_ANNOTATION_MODEL_PATH="/path/to/the/model/graph" # truncate .pb extension
```

### Tensorflow Mask RCNN
- Download Mask RCNN model, and save it somewhere:
```sh
curl https://github.com/matterport/Mask_RCNN/releases/download/v2.0/mask_rcnn_coco.h5 -o mask_rcnn_coco.h5
```
- Add next lines to ``.env/bin/activate``:
```sh
    export AUTO_SEGMENTATION="yes"
    export AUTO_SEGMENTATION_PATH="/path/to/dir" # dir must contain mask_rcnn_coco.h5 file
```

## JavaScript/Typescript coding style

We use the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for JavaScript code with a
litle exception - we prefere 4 spaces for indentation of nested blocks and statements.

## Branching model

The project uses [a successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model).
Thus it has a couple of branches. Some of them are described below:

- `origin/master` to be the main branch where the source code of
HEAD always reflects a production-ready state.
- `origin/develop` to be the main branch where the source code of
HEAD always reflects a state with the latest delivered development
changes for the next release. Some would call this the “integration branch”.

## Using the issue tracker

The issue tracker is the preferred channel for [bug reports](#bugs),
[features requests](#features) and [submitting pull
requests](#pull-requests), but please respect the following restrictions:

* Please **do not** use the issue tracker for personal support requests (use
  [Stack Overflow](http://stackoverflow.com)).

* Please **do not** derail or troll issues. Keep the discussion on topic and
  respect the opinions of others.

  <a name="bugs"></a>
## Bug reports

A bug is a _demonstrable problem_ that is caused by the code in the repository.
Good bug reports are extremely helpful - thank you!

Guidelines for bug reports:

1. **Use the GitHub issue search** &mdash; check if the issue has already been
   reported.

2. **Check if the issue has been fixed** &mdash; try to reproduce it using the
   latest `develop` branch in the repository.

3. **Isolate the problem** &mdash; ideally create a reduced test case.

A good bug report shouldn't leave others needing to chase you up for more
information. Please try to be as detailed as possible in your report. What is
your environment? What steps will reproduce the issue? What browser(s) and OS
experience the problem? What would you expect to be the outcome? All these
details will help people to fix any potential bugs.

Example:

> Short and descriptive example bug report title
>
> A summary of the issue and the browser/OS environment in which it occurs. If
> suitable, include the steps required to reproduce the bug.
>
> 1. This is the first step
> 2. This is the second step
> 3. Further steps, etc.
>
>
> Any other information you want to share that is relevant to the issue being
> reported. This might include the lines of code that you have identified as
> causing the bug, and potential solutions (and your opinions on their
> merits).

<a name="features"></a>
## Feature requests

Feature requests are welcome. But take a moment to find out whether your idea
fits with the scope and aims of the project. It's up to *you* to make a strong
case to convince the project's developers of the merits of this feature. Please
provide as much detail and context as possible.

<a name="pull-requests"></a>
## Pull requests

Good pull requests - patches, improvements, new features - are a fantastic
help. They should remain focused in scope and avoid containing unrelated
commits.

**Please ask first** before embarking on any significant pull request (e.g.
implementing features, refactoring code, porting to a different language),
otherwise you risk spending a lot of time working on something that the
project's developers might not want to merge into the project.

Please adhere to the coding conventions used throughout a project (indentation,
accurate comments, etc.) and any other requirements (such as test coverage).

Follow this process if you'd like your work considered for inclusion in the
project:

1. [Fork](http://help.github.com/fork-a-repo/) the project, clone your fork,
   and configure the remotes:

   ```bash
   # Clone your fork of the repo into the current directory
   git clone https://github.com/<your-username>/<repo-name>
   # Navigate to the newly cloned directory
   cd <repo-name>
   # Assign the original repo to a remote called "upstream"
   git remote add upstream https://github.com/<upstream-owner>/<repo-name>
   ```

2. If you cloned a while ago, get the latest changes from upstream:

   ```bash
   git checkout <dev-branch>
   git pull upstream <dev-branch>
   ```

3. Create a new topic branch (off the main project development branch) to
   contain your feature, change, or fix:

   ```bash
   git checkout -b <topic-branch-name>
   ```

4. Commit your changes in logical chunks. Please adhere to these [git commit
   message guidelines](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
   or your code is unlikely be merged into the main project. Use Git's
   [interactive rebase](https://help.github.com/articles/interactive-rebase)
   feature to tidy up your commits before making them public.

5. Locally merge (or rebase) the upstream development branch into your topic branch:

   ```bash
   git pull [--rebase] upstream <dev-branch>
   ```

6. Push your topic branch up to your fork:

   ```bash
   git push origin <topic-branch-name>
   ```

7. [Open a Pull Request](https://help.github.com/articles/using-pull-requests/)
    with a clear title and description.

**IMPORTANT**: By submitting a patch, you agree to allow the project owner to
license your work under the same license as that used by the project.
