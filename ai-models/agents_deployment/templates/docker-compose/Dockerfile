# We are aiming at using some thin image so that we can install only the necessary dependencies for our agent. Python 3.14-slim is a good choice for that.
FROM python:3.14-slim

# Install necessary tools, feel free to add more if needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# These args are used to be able to build both GPU and CPU only images. If USE_GPU is set to true, we will install the GPU version of PyTorch, otherwise we will install the CPU only version.
# Note that GPU support is only available for amd64 architecture, so we will check the TARGETARCH arg as well.
ARG USE_GPU=false
ARG TARGETARCH

# We would like to be able to deploy our image to k8s as well with Helm so we need kubectl.
ADD --chmod=+x https://dl.k8s.io/release/v1.34.0/bin/linux/${TARGETARCH}/kubectl /usr/local/bin/

# Running as non root is good for security.
RUN groupadd --gid 1000 agent && \
    useradd --uid 1000 --gid 1000 --create-home agent

# Required to share data in compose.
RUN mkdir /shared && chown agent:agent /shared

WORKDIR /app

# Replace this with your relative path to the requirements.txt file. This file should contain all the dependencies for your agent.
COPY path_to_your_model/requirements.txt .

# Assuming that your model uses pytorch this condition is responsible for building CPU only or GPU images.
RUN if [ "$USE_GPU" = "true" ] && [ "$TARGETARCH" = "amd64" ]; then \
        echo "Building GPU image" && pip install --no-cache-dir cvat-cli -r requirements.txt; \
    else \
        echo "Building CPU only image" && pip install --no-cache-dir cvat-cli -r requirements.txt --extra-index-url=https://download.pytorch.org/whl/cpu; \
    fi

# Replace this with your relative path to the model files.
# Assuming that you are using same names for the scripts.
COPY path_to_your_model/ .
COPY --chmod=755 path_to_your_model/function_registration.sh .
COPY --chmod=755 path_to_your_model/function_deregistration.sh .
COPY --chmod=755 path_to_your_model/check_env.sh .
COPY --chmod=755 path_to_your_model/entrypoint.sh .

USER agent

ENTRYPOINT ["./entrypoint.sh"]
