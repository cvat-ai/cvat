#!/bin/bash
# Start CVAT with Nuclio and deploy specified serverless functions (CPU & GPU)

set -eu

echo "📦 Starting CVAT and Nuclio containers..."
docker compose -f docker-compose.yml \
  -f components/serverless/docker-compose.serverless.yml \
  up -d --build

echo "⏳ Waiting for Nuclio Dashboard to be ready..."
until curl -s http://localhost:8070 > /dev/null; do
  echo "  ...still waiting for http://localhost:8070"
  sleep 3
done

echo "✅ Nuclio Dashboard is ready."

docker build -t anomalib-base:ubuntu22.04 serverless/pytorch/anomalib

echo "🚀 Deploying CPU-based Nuclio functions..."
./serverless/deploy_array_cpu.sh serverless/cpu_functions.txt

echo "🚀 Deploying GPU-based Nuclio functions..."
./serverless/deploy_array_gpu.sh serverless/gpu_functions.txt

echo "✅ All functions deployed. CVAT is ready to use."
