# https://github.com/nuclio/nuclio/blob/master/docs/reference/runtimes/python/python-reference.md#python-reference
ARG NUCLIO_LABEL=0.7.1
ARG NUCLIO_ARCH=amd64
ARG NUCLIO_BASE_IMAGE=openvino/ubuntu18_runtime:2020.2
ARG NUCLIO_ONBUILD_IMAGE=nuclio/handler-builder-python-onbuild:${NUCLIO_LABEL}-${NUCLIO_ARCH}

# Supplies processor uhttpc, used for healthcheck
FROM nuclio/uhttpc:latest-amd64 as uhttpc

# Supplies processor binary, wrapper
FROM ${NUCLIO_ONBUILD_IMAGE} as processor

# From the base image
FROM ${NUCLIO_BASE_IMAGE}

# Copy required objects from the suppliers
COPY --from=processor /home/nuclio/bin/processor /usr/local/bin/processor
COPY --from=processor /home/nuclio/bin/py /opt/nuclio/
COPY --from=uhttpc /home/nuclio/bin/uhttpc /usr/local/bin/uhttpc

RUN pip3 install nuclio-sdk msgpack

# Readiness probe
HEALTHCHECK --interval=1s --timeout=3s CMD /usr/local/bin/uhttpc --url http://127.0.0.1:8082/ready || exit 1

# USER CONTENT
USER root
WORKDIR /opt/nuclio
ENV PATH=/opt/nuclio:${PATH}
RUN curl -O https://download.01.org/openvinotoolkit/models_contrib/cvat/dextr_model_v1.zip
RUN unzip dextr_model_v1.zip
COPY ./function/requirements.txt ./
RUN pip3 install -r requirements.txt
COPY ./function ./
COPY ./function.yaml /etc/nuclio/config/processor/processor.yaml

USER openvino
# END OF USER CONTENT

# Run processor with configuration and platform configuration
CMD [ "processor" ]
