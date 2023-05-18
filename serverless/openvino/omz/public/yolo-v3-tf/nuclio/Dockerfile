FROM openvino/ubuntu20_dev:2022.3.0 AS build

USER root

RUN omz_downloader \
    --name yolo-v3-tf \
    -o /opt/nuclio/open_model_zoo.orig

RUN omz_converter \
    --name yolo-v3-tf \
    --precisions FP32 \
    -d /opt/nuclio/open_model_zoo.orig \
    -o /opt/nuclio/open_model_zoo

FROM cvat.openvino.base

COPY --from=build --chown=root:root /opt/nuclio/open_model_zoo /opt/nuclio/open_model_zoo
