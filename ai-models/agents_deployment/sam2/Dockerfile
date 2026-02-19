FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 agent && \
    useradd --uid 1000 --gid 1000 --create-home agent

RUN mkdir /shared && chown agent:agent /shared

WORKDIR /app

COPY ai-models/tracker/sam2/requirements.txt .
RUN pip install --no-cache-dir cvat-cli -r requirements.txt

COPY ai-models/tracker/sam2/ .
COPY ai-models/agents_deployment/sam2/function_registration.sh .
COPY ai-models/agents_deployment/sam2/function_deregistration.sh .
COPY ai-models/agents_deployment/sam2/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh function_registration.sh function_deregistration.sh

USER agent

ENTRYPOINT ["/entrypoint.sh"]
