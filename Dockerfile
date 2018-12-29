FROM ubuntu:16.04

ARG http_proxy
ARG https_proxy
ARG no_proxy

ENV TERM=xterm \
    http_proxy=${http_proxy}   \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy}

ENV LANG='C.UTF-8'  \
    LC_ALL='C.UTF-8'

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
        unzip \
        unrar \
        p7zip-full \
        vim && \
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
RUN if [ "$OPENVINO_TOOLKIT" = "yes" ]; then \
        /tmp/components/openvino/install.sh; \
    fi

# CUDA support
ARG CUDA_SUPPORT
ENV CUDA_SUPPORT=${CUDA_SUPPORT}
RUN if [ "$CUDA_SUPPORT" = "yes" ]; then \
        /tmp/components/cuda/install.sh; \
    fi

# Tensorflow annotation support
ARG TF_ANNOTATION
ENV TF_ANNOTATION=${TF_ANNOTATION}
ENV TF_ANNOTATION_MODEL_PATH=${HOME}/rcnn/inference_graph
RUN if [ "$TF_ANNOTATION" = "yes" ]; then \
        bash -i /tmp/components/tf_annotation/install.sh; \
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
            karma-coverage \
            karma-junit-reporter \
            karma-qunit \
            qunit; \
        echo "export PATH=~/tests/node_modules/.bin:${PATH}" >> ~/.bashrc; \
    fi

# Install and initialize CVAT, copy all necessary files
COPY cvat/requirements/ /tmp/requirements/
COPY supervisord.conf mod_wsgi.conf wait-for-it.sh manage.py ${HOME}/
RUN  pip3 install --no-cache-dir -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt
COPY cvat/ ${HOME}/cvat
COPY tests ${HOME}/tests
RUN patch -p1 < ${HOME}/cvat/apps/engine/static/engine/js/3rdparty.patch
RUN  chown -R ${USER}:${USER} .

# RUN all commands below as 'django' user
USER ${USER}

RUN mkdir data share media keys logs /tmp/supervisord
RUN python3 manage.py collectstatic

EXPOSE 8080 8443
ENTRYPOINT ["/usr/bin/supervisord"]
