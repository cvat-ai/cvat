ARG PIP_VERSION=22.0.2
ARG BASE_IMAGE=ubuntu:22.04

FROM ${BASE_IMAGE} as build-image-base

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

ARG PIP_VERSION
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN --mount=type=cache,target=/root/.cache/pip/http \
    python3 -m pip install -U pip==${PIP_VERSION}

# We build OpenH264, FFmpeg and PyAV in a separate build stage,
# because this way Docker can do it in parallel to all the other packages.
FROM build-image-base AS build-image-av

# Compile Openh264 and FFmpeg
ARG PREFIX=/opt/ffmpeg
ARG PKG_CONFIG_PATH=${PREFIX}/lib/pkgconfig

ENV FFMPEG_VERSION=4.3.1 \
    OPENH264_VERSION=2.1.1

WORKDIR /tmp/openh264
RUN curl -sL https://github.com/cisco/openh264/archive/v${OPENH264_VERSION}.tar.gz --output - | \
    tar -zx --strip-components=1 && \
    make -j5 && make install-shared PREFIX=${PREFIX} && make clean

WORKDIR /tmp/ffmpeg
RUN curl -sL https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.bz2 --output - | \
    tar -jx --strip-components=1 && \
    ./configure --disable-nonfree --disable-gpl --enable-libopenh264 \
        --enable-shared --disable-static --disable-doc --disable-programs --prefix="${PREFIX}" && \
    make -j5 && make install && make clean

COPY utils/dataset_manifest/requirements.txt /tmp/utils/dataset_manifest/requirements.txt

# Since we're using pip-compile-multi, each dependency can only be listed in
# one requirements file. In the case of PyAV, that should be
# `dataset_manifest/requirements.txt`. Make sure it's actually there,
# and then remove everything else.
RUN grep -q '^av==' /tmp/utils/dataset_manifest/requirements.txt
RUN sed -i '/^av==/!d' /tmp/utils/dataset_manifest/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip/http \
    python3 -m pip wheel \
    -r /tmp/utils/dataset_manifest/requirements.txt \
    -w /tmp/wheelhouse

# This stage builds wheels for all dependencies (except PyAV)
FROM build-image-base AS build-image

COPY cvat/requirements/ /tmp/cvat/requirements/
COPY utils/dataset_manifest/requirements.txt /tmp/utils/dataset_manifest/requirements.txt

# Exclude av from the requirements file
RUN sed -i '/^av==/d' /tmp/utils/dataset_manifest/requirements.txt

ARG DJANGO_CONFIGURATION="production"

RUN --mount=type=cache,target=/root/.cache/pip/http \
    DATUMARO_HEADLESS=1 python3 -m pip wheel --no-deps \
    -r /tmp/cvat/requirements/${DJANGO_CONFIGURATION}.txt \
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

# Install wheels from the build image
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
ARG PIP_VERSION
ARG PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m pip install -U pip==${PIP_VERSION}
RUN --mount=type=bind,from=build-image,source=/tmp/wheelhouse,target=/mnt/wheelhouse \
    --mount=type=bind,from=build-image-av,source=/tmp/wheelhouse,target=/mnt/wheelhouse-av \
    python -m pip install --no-index /mnt/wheelhouse/*.whl /mnt/wheelhouse-av/*.whl

ENV NUMPROCS=1
COPY --from=build-image-av /opt/ffmpeg/lib /usr/lib

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
