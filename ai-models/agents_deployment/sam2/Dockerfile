# amd64 and arm64 CPU only
FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
ADD --chmod=+x https://dl.k8s.io/release/v1.34.0/bin/linux/${TARGETARCH}/kubectl /usr/local/bin/

RUN if [ "$TARGETARCH" = "amd64" ]; then \
        pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu; \
    fi

RUN groupadd --gid 1000 agent && \
    useradd --uid 1000 --gid 1000 --create-home agent

RUN mkdir /shared && chown agent:agent /shared

WORKDIR /app

COPY ai-models/tracker/sam2/requirements.txt .
RUN pip install --no-cache-dir cvat-cli -r requirements.txt

COPY ai-models/tracker/sam2/ .
COPY --chmod=755 ai-models/agents_deployment/sam2/function_registration.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/function_deregistration.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/check_env.sh .
COPY --chmod=755 ai-models/agents_deployment/sam2/entrypoint.sh .

USER agent

ENTRYPOINT ["./entrypoint.sh"]
