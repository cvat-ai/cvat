FROM openvino/ubuntu20_runtime:2022.3.0

USER root

RUN apt-get update \
    && apt-get -y --no-install-recommends install python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir opencv-python-headless pillow pyyaml

COPY model_loader.py shared.py /opt/nuclio/common/openvino/

ENV PYTHONPATH=/opt/nuclio/common/openvino:$PYTHONPATH

USER openvino
