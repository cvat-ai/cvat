FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

ARG USE_GPU=false
ARG TARGETARCH

RUN groupadd --gid 1000 agent && \
    useradd --uid 1000 --gid 1000 --create-home agent

RUN mkdir /shared && chown agent:agent /shared

WORKDIR /app

COPY ai-models/tracker/sam2/requirements.txt .

RUN if [ "$USE_GPU" = "true" ] && [ "$TARGETARCH" = "amd64" ]; then \
        echo "Building GPU image" && pip install --no-cache-dir cvat-cli -r requirements.txt; \
    else \
        echo "Building CPU only image" && pip install --no-cache-dir cvat-cli -r requirements.txt --extra-index-url=https://download.pytorch.org/whl/cpu; \
    fi

COPY ai-models/tracker/sam2/ .
COPY --chmod=755 ai-models/agents_deployment/sam2/function_registration.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/function_deregistration.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/check_env.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/entrypoint.sh .

#v1.34.5 fixes CVE-2025-68121
ADD --chmod=+x https://dl.k8s.io/release/v1.34.6/bin/linux/${TARGETARCH}/kubectl /usr/local/bin/

USER agent

ENTRYPOINT ["./entrypoint.sh"]
