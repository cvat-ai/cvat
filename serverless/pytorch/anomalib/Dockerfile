# Use Ubuntu as base
FROM ubuntu:22.04

# Set noninteractive frontend for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-distutils \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    curl \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Symlink python3 to python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Upgrade pip
RUN python -m pip install --upgrade pip

# Set workdir to /app and copy everything (including anomalib folder)
WORKDIR /app
# Copy only the anomalib directory
COPY anomalib /app/anomalib

# Install Anomalib from local source
RUN pip install -e /app/anomalib[full]

RUN pip install msgpack nuclio_sdk

# Optional: check installation
RUN python -c "import anomalib; print('Anomalib version:', anomalib.__version__)"