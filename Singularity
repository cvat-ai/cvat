Bootstrap: docker
From: ubuntu:16.04

# This is the Singularity container to build the cvat image.
# It would be more ideal to have a shared docker base to start from
# but this doesn't currently exist.

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
export UI_SCHEME="http"
export UI_HOST="localhost"
export UI_PORT=7080


%post
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

# Install necessary apt packages
apt-get update && \
    apt-get install -yq \
        software-properties-common && \
    add-apt-repository ppa:mc3man/xerus-media -y && \
    add-apt-repository ppa:mc3man/gstffmpeg-keep -y && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -yq \
        apache2 \
        apache2-dev \
        libapache2-mod-xsendfile \
        supervisor \
        ffmpeg \
        gstreamer0.10-ffmpeg \
        libldap2-dev \
        libsasl2-dev \
        iputils-ping \
        python3-dev \
        python3-pip \
        tzdata \
        p7zip-full \
        git \
        ssh \
        poppler-utils \
        curl && \
    curl https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install -y git-lfs && git lfs install && \
    if [ -z ${socks_proxy} ]; then \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30\"" >> ${HOME}/.bashrc; \
    else \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ProxyCommand='nc -X 5 -x ${socks_proxy} %h %p'\"" >> ${HOME}/.bashrc; \
    fi && \
    python3 -m pip install --no-cache-dir -U pip==20.0.1 setuptools && \
    ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    add-apt-repository --remove ppa:mc3man/gstffmpeg-keep -y && \
    add-apt-repository --remove ppa:mc3man/xerus-media -y && \
    rm -rf /var/lib/apt/lists/*

# Singularity doesn't support _ in hostname
find /home/django -type f -not -path '*/\.*' -exec sed -i 's/cvat_db/cvatdb/g' {} +
find /home/django -type f -not -path '*/\.*' -exec sed -i 's/cvat_redis/cvatredis/g' {} +
find /home/django -type f -not -path '*/\.*' -exec sed -i 's/cvat_ui/cvatui/g' {} +

# Add a non-root user
export HOME=/home/${USER}
cd ${HOME}
adduser --shell /bin/bash --disabled-password --gecos "" ${USER}

echo "Contents of /tmp/components"
ls /tmp/components
echo "Contents of $HOME"

# OpenVINO toolkit support

export REID_MODEL_DIR=${HOME}/reid
if [ "$OPENVINO_TOOLKIT" = "yes" ]; then
    /tmp/components/openvino/install.sh &&
    mkdir ${REID_MODEL_DIR} &&
    curl https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.xml -o reid/reid.xml &&
    curl https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.bin -o reid/reid.bin;
fi

# Tensorflow annotation support
export TF_ANNOTATION_MODEL_PATH=${HOME}/rcnn/inference_graph
if [ "$TF_ANNOTATION" = "yes" ]; then
    bash -i /tmp/components/tf_annotation/install.sh;
fi

# Auto segmentation support. by Mohammad
export AUTO_SEGMENTATION_PATH=${HOME}/Mask_RCNN
if [ "$AUTO_SEGMENTATION" = "yes" ]; then
    bash -i /tmp/components/auto_segmentation/install.sh
fi

# Install and initialize CVAT, copy all necessary files
python3 -m pip install --no-cache-dir -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt
# pycocotools package is impossible to install with its dependencies by one pip install command
python3 -m pip install --no-cache-dir pycocotools==2.0.0

# CUDA support
if [ "$CUDA_SUPPORT" = "yes" ]; then
    /tmp/components/cuda/install.sh;
fi

# TODO: CHANGE URL
export DEXTR_MODEL_DIR=${HOME}/dextr
if [ "$WITH_DEXTR" = "yes" ]; then
    mkdir ${DEXTR_MODEL_DIR} -p &&
    curl https://download.01.org/openvinotoolkit/models_contrib/cvat/dextr_model_v1.zip -o ${DEXTR_MODEL_DIR}/dextr.zip && \
    7z e ${DEXTR_MODEL_DIR}/dextr.zip -o${DEXTR_MODEL_DIR} && rm ${DEXTR_MODEL_DIR}/dextr.zip; \
fi

sed -r "s/^(.*)#.*$/\1/g" ${HOME}/datumaro/requirements.txt | xargs -n 1 -L 1 python3 -m pip install --no-cache-dir

# Binary option is necessary to correctly apply the patch on Windows platform.
# https://unix.stackexchange.com/questions/239364/how-to-fix-hunk-1-failed-at-1-different-line-endings-message
patch --binary -p1 < ${HOME}/cvat/apps/engine/static/engine/js/3rdparty.patch
chown -R ${USER}:${USER} .

# RUN all commands below as 'django' user
# USER ${USER}
ls 
mkdir -p data share media keys logs /tmp/supervisord /root/logs/
python3 manage.py collectstatic

%startscript
cd /home/django
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8080
# old start command commented out, using runserver for now.
# this should either be fixed or replaced with different method to run server
#/usr/bin/supervisord -c /home/django/supervisord.conf --logfile /tmp/cvat-supervisord.log

%setup
mkdir -p "${SINGULARITY_ROOTFS}/home/django"

%files
./components /tmp/components
./cvat/requirements /tmp/requirements
./supervisord-singularity.conf /home/django/supervisord.conf
./mod_wsgi.conf /home/django/
./wait-for-it.sh /home/django/
./manage.py /home/django/
./ssh /home/django/.ssh
./utils /home/django/utils
./cvat /home/django/cvat
./cvat-core /home/django/cvat-core
./tests /home/django/tests
./datumaro /home/django/datumaro
