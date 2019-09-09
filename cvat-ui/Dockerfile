FROM ubuntu:18.04 AS cvat-ui

ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG socks_proxy

ENV TERM=xterm \
    http_proxy=${http_proxy}   \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    socks_proxy=${socks_proxy}

ENV LANG='C.UTF-8'  \
    LC_ALL='C.UTF-8'

# Install necessary apt packages
RUN apt update && apt install -yq nodejs npm curl && \
    npm install -g n && n 10.16.3

# Create output directory
RUN mkdir /tmp/cvat-ui
WORKDIR /tmp/cvat-ui/

# Install dependencies
COPY package*.json /tmp/cvat-ui/
RUN npm install

# Build source code
COPY . /tmp/cvat-ui/
RUN mv .env.production .env && npm run build

FROM nginx
# Replace default.conf configuration to remove unnecessary rules
COPY react_nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=cvat-ui /tmp/cvat-ui/build /usr/share/nginx/html/
