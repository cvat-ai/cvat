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
    apt-get --no-install-recommends install -yq \
        software-properties-common && \
    add-apt-repository ppa:mc3man/xerus-media -y && \
    add-apt-repository ppa:mc3man/gstffmpeg-keep -y && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -yq \
        apache2 \
        apache2-dev \
        apt-utils \
        build-essential \
        libapache2-mod-xsendfile \
        supervisor \
        ffmpeg \
        gstreamer0.10-ffmpeg \
        libavcodec-dev \
        libavdevice-dev \
        libavfilter-dev \
        libavformat-dev \
        libavutil-dev \
        libswresample-dev \
        libswscale-dev \
        libldap2-dev \
        libsasl2-dev \
        pkg-config \
        python3-dev \
        python3-pip \
        tzdata \
        p7zip-full \
        git \
        ssh \
        poppler-utils \
        curl && \
    curl https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get --no-install-recommends install -y git-lfs && git lfs install && \
    python3 -m pip install --no-cache-dir -U pip==20.0.1 setuptools>=49.1.0 && \
    ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    add-apt-repository --remove ppa:mc3man/gstffmpeg-keep -y && \
    add-apt-repository --remove ppa:mc3man/xerus-media -y && \
    rm -rf /var/lib/apt/lists/* && \
    echo 'application/wasm wasm' >> /etc/mime.types

# Add a non-root user
ENV USER=${USER}
ENV HOME /home/${USER}
WORKDIR ${HOME}
RUN adduser --shell /bin/bash --disabled-password --gecos "" ${USER} && \
    if [ -z ${socks_proxy} ]; then \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30\"" >> ${HOME}/.bashrc; \
    else \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ProxyCommand='nc -X 5 -x ${socks_proxy} %h %p'\"" >> ${HOME}/.bashrc; \
    fi

COPY components /tmp/components

# Install and initialize CVAT, copy all necessary files
COPY cvat/requirements/ /tmp/requirements/
COPY supervisord.conf mod_wsgi.conf wait-for-it.sh manage.py ${HOME}/
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt
# pycocotools package is impossible to install with its dependencies by one pip install command
RUN python3 -m pip install --no-cache-dir pycocotools==2.0.0

ARG CLAM_AV
ENV CLAM_AV=${CLAM_AV}
RUN if [ "$CLAM_AV" = "yes" ]; then \
        apt-get update && \
        apt-get --no-install-recommends install -yq \
            clamav \
            libclamunrar9 && \
        sed -i 's/ReceiveTimeout 30/ReceiveTimeout 300/g' /etc/clamav/freshclam.conf && \
        freshclam && \
        chown -R ${USER}:${USER} /var/lib/clamav && \
        rm -rf /var/lib/apt/lists/*; \
    fi

COPY ssh ${HOME}/.ssh
COPY utils ${HOME}/utils
COPY cvat/ ${HOME}/cvat
COPY cvat-core/ ${HOME}/cvat-core
COPY cvat-data/ ${HOME}/cvat-data
COPY tests ${HOME}/tests
COPY datumaro/ ${HOME}/datumaro

RUN python3 -m pip install --no-cache-dir -r ${HOME}/datumaro/requirements.txt

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
