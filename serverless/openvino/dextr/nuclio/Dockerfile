FROM openvino/ubuntu20_dev:2022.3.0 AS build

USER root

RUN apt-get update \
    && apt-get -y --no-install-recommends install patch \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /root

ARG DEXTR_COMMIT=352ccc76067156ebcf7267b07e0a5e43d32e83d5

# TODO: use `ADD --checksum` when that feature becomes stable
ADD https://data.vision.ee.ethz.ch/csergi/share/DEXTR/dextr_pascal-sbd.pth ./

ADD https://github.com/scaelles/DEXTR-PyTorch/archive/$DEXTR_COMMIT.zip dextr.zip

RUN python3 -m zipfile -e dextr.zip .

WORKDIR /root/DEXTR-PyTorch-$DEXTR_COMMIT

ADD export.py adaptive-pool.patch .

RUN patch -p1 -i adaptive-pool.patch

RUN python3 export.py /root/dextr_pascal-sbd.pth /root/dextr.onnx

RUN mo --input_model=/root/dextr.onnx --model_name=dextr --output_dir=/root

FROM cvat.openvino.base

COPY --from=build --chown=root:root /root/dextr.xml /root/dextr.bin /opt/nuclio/
