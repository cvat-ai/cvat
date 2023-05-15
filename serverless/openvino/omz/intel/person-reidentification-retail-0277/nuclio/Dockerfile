FROM openvino/ubuntu20_dev:2022.3.0 AS build

USER root

RUN omz_downloader \
    --name person-reidentification-retail-0277 \
    --precisions FP32 \
    -o /opt/nuclio/open_model_zoo

FROM cvat.openvino.base

USER root

RUN pip install --no-cache-dir scipy

COPY --from=build /opt/nuclio/open_model_zoo /opt/nuclio/open_model_zoo

USER openvino
