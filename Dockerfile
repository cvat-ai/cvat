FROM ubuntu:16.04

ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG socks_proxy
ARG TZ

ENV TERM=xterm \
    http_proxy=${http_proxy}   \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    socks_proxy=${socks_proxy} \
    LANG='C.UTF-8'  \
    LC_ALL='C.UTF-8' \
    TZ=${TZ}

ARG USER
ARG DJANGO_CONFIGURATION
ENV DJANGO_CONFIGURATION=${DJANGO_CONFIGURATION}

# Install necessary apt packages
RUN apt-get update && \
    apt-get install -yq \
        python-software-properties \
        software-properties-common \
        wget && \
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
        python3-dev \
        python3-pip \
        tzdata \
        unzip \
        unrar \
        p7zip-full \
        vim \
        git-core \
        libsm6 \
        libxext6 && \
    pip3 install -U setuptools && \
    ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    add-apt-repository --remove ppa:mc3man/gstffmpeg-keep -y && \
    add-apt-repository --remove ppa:mc3man/xerus-media -y && \
    rm -rf /var/lib/apt/lists/*

# Add a non-root user
ENV USER=${USER}
ENV HOME /home/${USER}
WORKDIR ${HOME}
RUN adduser --shell /bin/bash --disabled-password --gecos "" ${USER}

COPY components /tmp/components

# OpenVINO toolkit support
ARG OPENVINO_TOOLKIT
ENV OPENVINO_TOOLKIT=${OPENVINO_TOOLKIT}
ENV REID_MODEL_DIR=${HOME}/reid
RUN if [ "$OPENVINO_TOOLKIT" = "yes" ]; then \
        /tmp/components/openvino/install.sh && \
        mkdir ${REID_MODEL_DIR} && \
        wget https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.xml -O reid/reid.xml && \
        wget https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-reidentification-retail-0079/FP32/person-reidentification-retail-0079.bin -O reid/reid.bin; \
    fi

# Tensorflow annotation support
ARG TF_ANNOTATION
ENV TF_ANNOTATION=${TF_ANNOTATION}
ENV TF_ANNOTATION_MODEL_PATH=${HOME}/rcnn/inference_graph
RUN if [ "$TF_ANNOTATION" = "yes" ]; then \
        bash -i /tmp/components/tf_annotation/install.sh; \
    fi

# Auto segmentation support. by Mohammad
ARG AUTO_SEGMENTATION
ENV AUTO_SEGMENTATION=${AUTO_SEGMENTATION}
ENV AUTO_SEGMENTATION_PATH=${HOME}/Mask_RCNN
RUN if [ "$AUTO_SEGMENTATION" = "yes" ]; then \
    bash -i /tmp/components/auto_segmentation/install.sh; \
    fi

ARG WITH_TESTS
RUN if [ "$WITH_TESTS" = "yes" ]; then \
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
        echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' | tee /etc/apt/sources.list.d/google-chrome.list && \
        wget -qO- https://deb.nodesource.com/setup_9.x | bash - && \
        apt-get update && \
        DEBIAN_FRONTEND=noninteractive apt-get install -yq \
            google-chrome-stable \
            nodejs && \
        rm -rf /var/lib/apt/lists/*; \
        mkdir tests && cd tests && npm install \
            eslint \
            eslint-detailed-reporter \
            karma \
            karma-chrome-launcher \
            karma-coveralls \
            karma-coverage \
            karma-junit-reporter \
            karma-qunit \
            qunit; \
        echo "export PATH=~/tests/node_modules/.bin:${PATH}" >> ~/.bashrc; \
    fi

# Install and initialize CVAT, copy all necessary files
COPY cvat/requirements/ /tmp/requirements/
COPY supervisord.conf mod_wsgi.conf wait-for-it.sh manage.py ${HOME}/
RUN pip3 install --no-cache-dir -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt
# pycocotools package is impossible to install with its dependencies by one pip install command
RUN pip3 install --no-cache-dir pycocotools==2.0.0

# Install git application dependencies
RUN apt-get update && \
    apt-get install -y ssh netcat-openbsd git curl zip  && \
    wget -qO /dev/stdout https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install -y git-lfs && \
    git lfs install && \
    rm -rf /var/lib/apt/lists/* && \
    if [ -z ${socks_proxy} ]; then \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30\"" >> ${HOME}/.bashrc; \
    else \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ProxyCommand='nc -X 5 -x ${socks_proxy} %h %p'\"" >> ${HOME}/.bashrc; \
    fi

# CUDA support
ARG CUDA_SUPPORT
ENV CUDA_SUPPORT=${CUDA_SUPPORT}
RUN if [ "$CUDA_SUPPORT" = "yes" ]; then \
        /tmp/components/cuda/install.sh; \
    fi

# TODO: CHANGE URL
ARG WITH_DEXTR
ENV WITH_DEXTR=${WITH_DEXTR}
ENV DEXTR_MODEL_DIR=${HOME}/dextr
RUN if [ "$WITH_DEXTR" = "yes" ]; then \
        mkdir ${DEXTR_MODEL_DIR} -p && \
        wget https://download.01.org/openvinotoolkit/models_contrib/cvat/dextr_model_v1.zip -O ${DEXTR_MODEL_DIR}/dextr.zip && \
        unzip ${DEXTR_MODEL_DIR}/dextr.zip -d ${DEXTR_MODEL_DIR} && rm ${DEXTR_MODEL_DIR}/dextr.zip; \
    fi

COPY ssh ${HOME}/.ssh
COPY utils ${HOME}/utils
COPY cvat/ ${HOME}/cvat
COPY cvat-core/ ${HOME}/cvat-core
COPY tests ${HOME}/tests

RUN while read -r line; do pip3 install --no-cache-dir $line; done < ${HOME}/datumaro/requirements.txt
# Binary option is necessary to correctly apply the patch on Windows platform.
# https://unix.stackexchange.com/questions/239364/how-to-fix-hunk-1-failed-at-1-different-line-endings-message
RUN patch --binary -p1 < ${HOME}/cvat/apps/engine/static/engine/js/3rdparty.patch
RUN chown -R ${USER}:${USER} .

# RUN all commands below as 'django' user
USER ${USER}

RUN mkdir data share media keys logs /tmp/supervisord
RUN python3 manage.py collectstatic

EXPOSE 8080 8443
ENTRYPOINT ["/usr/bin/supervisord"]
