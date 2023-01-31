FROM ubuntu:20.04 as build-image

ARG http_proxy
ARG https_proxy
ARG no_proxy="nuclio,${no_proxy}"
ARG socks_proxy
ARG DJANGO_CONFIGURATION="production"

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -yq \
        apache2-dev \
        build-essential \
        curl \
        libldap2-dev \
        libsasl2-dev \
        nasm \
        git \
        pkg-config \
        python3-dev \
        python3-pip \
        python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Compile Openh264 and FFmpeg
ARG PREFIX=/opt/ffmpeg
ARG PKG_CONFIG_PATH=${PREFIX}/lib/pkgconfig

ENV FFMPEG_VERSION=4.3.1 \
    OPENH264_VERSION=2.1.1

WORKDIR /tmp/openh264
RUN curl -sL https://github.com/cisco/openh264/archive/v${OPENH264_VERSION}.tar.gz --output openh264-${OPENH264_VERSION}.tar.gz && \
    tar -zx --strip-components=1 -f openh264-${OPENH264_VERSION}.tar.gz && \
    make -j5 && make install PREFIX=${PREFIX} && make clean

WORKDIR /tmp/ffmpeg
RUN curl -sL https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.bz2 --output - | \
    tar -jx --strip-components=1 && \
    ./configure --disable-nonfree --disable-gpl --enable-libopenh264 --enable-shared --disable-static --prefix="${PREFIX}" && \
    # make clean keeps the configuration files that let to know how the original sources were used to create the binary
    make -j5 && make install && make clean && \
    tar -zcf "/tmp/ffmpeg-$FFMPEG_VERSION.tar.gz" . && mv "/tmp/ffmpeg-$FFMPEG_VERSION.tar.gz" .

# Install requirements
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
RUN python3 -m pip install --no-cache-dir -U pip==22.0.2 setuptools==60.6.0 wheel==0.37.1
COPY cvat/requirements/ /tmp/requirements/
# Takes forever on low-speed connection to install if not here.
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements/heavy.txt
RUN DATUMARO_HEADLESS=1 python3 -m pip install --no-cache-dir -r /tmp/requirements/${DJANGO_CONFIGURATION}.txt

# Install rebotics requirements
COPY rebotics/requirements.txt /tmp/requirements/rebotics.txt
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements/rebotics.txt

FROM node:16-slim AS cvat-ui

ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG socks_proxy
ARG PUBLIC_INSTANCE
ARG WA_PAGE_VIEW_HIT

ENV TERM=xterm \
    http_proxy=${http_proxy}   \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    socks_proxy=${socks_proxy} \
    LANG='C.UTF-8'  \
    LC_ALL='C.UTF-8'

# Install dependencies
COPY package*.json /tmp/
COPY cvat-core/package*.json /tmp/cvat-core/
COPY cvat-canvas/package*.json /tmp/cvat-canvas/
COPY cvat-canvas3d/package*.json /tmp/cvat-canvas3d/
COPY cvat-ui/package*.json /tmp/cvat-ui/
COPY cvat-data/package*.json /tmp/cvat-data/

# Install common dependencies
WORKDIR /tmp/
RUN npm ci --ignore-scripts

# Build source code
COPY cvat-data/ /tmp/cvat-data/
COPY cvat-core/ /tmp/cvat-core/
COPY cvat-canvas3d/ /tmp/cvat-canvas3d/
COPY cvat-canvas/ /tmp/cvat-canvas/
COPY cvat-ui/ /tmp/cvat-ui/
RUN npm run build:cvat-ui


FROM ubuntu:20.04

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
        ca-certificates \
        libapache2-mod-xsendfile \
        libgomp1 \
        libgl1 \
        supervisor \
        libldap-2.4-2 \
        libsasl2-2 \
        libpython3-dev \
        tzdata \
        python3-distutils \
        p7zip-full \
        git \
        git-lfs \
        poppler-utils \
        ssh \
        curl && \
    ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    echo 'application/wasm wasm' >> /etc/mime.types

# Install rebotics requirements
RUN apt-get update && \
    apt-get --no-install-recommends install -yq nginx && \
    rm -rf /var/lib/apt/lists/*

# Add a non-root user
ENV USER=${USER}
ENV HOME /home/${USER}
RUN adduser --shell /bin/bash --disabled-password --gecos "" ${USER} && \
    if [ -z ${socks_proxy} ]; then \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30\"" >> ${HOME}/.bashrc; \
    else \
        echo export "GIT_SSH_COMMAND=\"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ProxyCommand='nc -X 5 -x ${socks_proxy} %h %p'\"" >> ${HOME}/.bashrc; \
    fi

# Copy python virtual environment and FFmpeg binaries from build-image
COPY --from=build-image /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
COPY --from=build-image /opt/ffmpeg /usr

# Install and initialize CVAT, copy all necessary files
COPY --chown=${USER} components /tmp/components
COPY --chown=${USER} ssh ${HOME}/.ssh
COPY --chown=${USER} supervisord.conf mod_wsgi.conf wait-for-it.sh manage.py ${HOME}/
COPY --chown=${USER} cvat/ ${HOME}/cvat
COPY --chown=${USER} utils/ ${HOME}/utils
COPY --chown=${USER} tests/ ${HOME}/tests

# Install UI and setup nginx proxy
COPY --from=cvat-ui --chown=${USER} /tmp/cvat-ui/dist ${HOME}/static
COPY --chown=${USER} rebotics/supervisord.conf ${HOME}/
COPY rebotics/nginx_proxy.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s#\${HOME}#${HOME}#g" /etc/nginx/conf.d/default.conf && \
    sed -i "s#pid /run#pid ${HOME}#" /etc/nginx/nginx.conf && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log && \
    chown -R ${USER} /var/lib/nginx /var/log/nginx
RUN rm /etc/nginx/sites-enabled/default

# Add version file
COPY --chown=${USER} VERSION ${HOME}/static/version

# RUN all commands below as 'django' user
USER ${USER}
WORKDIR ${HOME}

RUN mkdir data share media keys logs /tmp/supervisord

EXPOSE 8080
ENTRYPOINT ["/usr/bin/supervisord"]
