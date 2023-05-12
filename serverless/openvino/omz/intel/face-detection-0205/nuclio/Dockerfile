FROM openvino/ubuntu20_dev:2022.3.0 AS build

USER root

RUN omz_downloader \
    --name face-detection-0205,emotions-recognition-retail-0003,age-gender-recognition-retail-0013 \
    --precisions FP32 \
    -o /opt/nuclio/open_model_zoo

FROM cvat.openvino.base

COPY --from=build --chown=root:root /opt/nuclio/open_model_zoo /opt/nuclio/open_model_zoo
