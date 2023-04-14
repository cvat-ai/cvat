ARG PIP_VERSION=22.0.2
ARG BASE_IMAGE=ubuntu:22.04

FROM ${BASE_IMAGE} as build-image

ARG DJANGO_CONFIGURATION="production"

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -yq \
        apache2-dev \
        curl \
        g++ \
        gcc \
        git \
        libgeos-dev \
        libldap2-dev \
        libsasl2-dev \
        make \
        nasm \
        pkg-config \
        python3-dev \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Compile Openh264 and FFmpeg
ARG PREFIX=/opt/ffmpeg
ARG PKG_CONFIG_PATH=${PREFIX}/lib/pkgconfig

ENV FFMPEG_VERSION=4.3.1 \
    OPENH264_VERSION=2.1.1

WORKDIR /tmp/openh264
RUN curl -sL https://github.com/cisco/openh264/archive/v${OPENH264_VERSION}.tar.gz --output openh264-${OPENH264_VERSION}.tar.gz && \
    tar -zx --strip-components=1 -f openh264-${OPENH264_VERSION}.tar.gz && \
    make -j5 && make install-shared PREFIX=${PREFIX} && make clean

WORKDIR /tmp/ffmpeg
RUN curl -sL https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.bz2 --output - | \
    tar -jx --strip-components=1 && \
    ./configure --disable-nonfree --disable-gpl --enable-libopenh264 \
        --enable-shared --disable-static --disable-doc --disable-programs --prefix="${PREFIX}" && \
    # make clean keeps the configuration files that let to know how the original sources were used to create the binary
    make -j5 && make install && make clean && \
    tar -zcf "/tmp/ffmpeg-$FFMPEG_VERSION.tar.gz" . && mv "/tmp/ffmpeg-$FFMPEG_VERSION.tar.gz" .

# Build wheels for all dependencies
ARG PIP_VERSION
RUN python3 -m pip install -U pip==${PIP_VERSION}
COPY cvat/requirements/ /tmp/requirements/
COPY utils/dataset_manifest/ /tmp/dataset_manifest/

# The server implementation depends on the dataset_manifest utility
# so we need to build its dependencies too
# https://github.com/opencv/cvat/issues/5096
RUN DATUMARO_HEADLESS=1 python3 -m pip wheel --no-cache-dir \
    -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt \
    -r /tmp/dataset_manifest/requirements.txt \
    -w /tmp/wheelhouse

FROM ${BASE_IMAGE}

ARG http_proxy
ARG https_proxy
ARG no_proxy="nuclio,${no_proxy}"
ARG socks_proxy
ARG TZ="Etc/UTC"

ENV TERM=xterm \
    http_proxy=${http_proxy}   \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    socks_proxy=${socks_proxy} \
    LANG='C.UTF-8'  \
    LC_ALL='C.UTF-8' \
    TZ=${TZ}

ARG USER="django"
ARG DJANGO_CONFIGURATION="production"
ENV DJANGO_CONFIGURATION=${DJANGO_CONFIGURATION}

# Install necessary apt packages
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -yq \
        apache2 \
        bzip2 \
        ca-certificates \
        curl \
        git \
        git-lfs \
        libapache2-mod-xsendfile \
        libgeos-c1v5 \
        libgl1 \
        libgomp1 \
        libldap-2.5-0 \
        libpython3.10 \
        libsasl2-2 \
        p7zip-full \
        poppler-utils \
        python3 \
        python3-distutils \
        python3-venv \
        ssh \
        supervisor \
        tzdata \
    && ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    echo 'application/wasm wasm' >> /etc/mime.types

# Add a non-root user
ENV USER=${USER}
ENV HOME /home/${USER}
RUN adduser --shell /bin/bash --disabled-password --gecos "" ${USER} && \
    if [ -z ${socks_proxy} ]; then \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30\"" >> ${HOME}/.bashrc; \
    else \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ProxyCommand='nc -X 5 -x ${socks_proxy} %h %p'\"" >> ${HOME}/.bashrc; \
    fi

ARG CLAM_AV="no"
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

ARG INSTALL_SOURCES='no'
WORKDIR ${HOME}/sources
RUN if [ "$INSTALL_SOURCES" = "yes" ]; then \
        sed -Ei 's/^# deb-src /deb-src /' /etc/apt/sources.list && \
        apt-get update && \
        dpkg --get-selections | while read -r line; do        \
            package=$(echo "$line" | awk '{print $1}');       \
            mkdir "$package";                                 \
            (                                                 \
                cd "$package";                                \
                apt-get -q --download-only source "$package"; \
            )                                                 \
            done &&                                           \
        rm -rf /var/lib/apt/lists/*;                          \
    fi
COPY --from=build-image /tmp/openh264/openh264*.tar.gz /tmp/ffmpeg/ffmpeg*.tar.gz ${HOME}/sources/

# Install wheels from the build image
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
ARG PIP_VERSION
RUN python -m pip install -U pip==${PIP_VERSION}
RUN --mount=type=bind,from=build-image,source=/tmp/wheelhouse,target=/mnt/wheelhouse \
    python -m pip install --no-index /mnt/wheelhouse/*.whl

ENV NUMPROCS=1
COPY --from=build-image /opt/ffmpeg/lib /usr/lib

# These variables are required for supervisord substitutions in files
# This library allows remote python debugging with VS Code
ARG CVAT_DEBUG_ENABLED
RUN if [ "${CVAT_DEBUG_ENABLED}" = 'yes' ]; then \
        python3 -m pip install --no-cache-dir debugpy; \
    fi

# Install and initialize CVAT, copy all necessary files
COPY --chown=${USER} components /tmp/components
COPY --chown=${USER} supervisord/ ${HOME}/supervisord
COPY --chown=${USER} ssh ${HOME}/.ssh
COPY --chown=${USER} mod_wsgi.conf wait-for-it.sh manage.py ${HOME}/
COPY --chown=${USER} utils/ ${HOME}/utils
COPY --chown=${USER} cvat/ ${HOME}/cvat

# RUN all commands below as 'django' user
USER ${USER}
WORKDIR ${HOME}

RUN mkdir -p data share keys logs /tmp/supervisord static

EXPOSE 8080
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["-c", "supervisord/all.conf"]
