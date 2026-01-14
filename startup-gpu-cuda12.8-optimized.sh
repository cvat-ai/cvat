#!/bin/bash
# Optimized startup script with base image builds

set -eu

echo "📦 Starting CVAT and Nuclio containers..."

docker compose -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f components/serverless/docker-compose.serverless.yml \
  -f tests/docker-compose.email.yml \
  -f docker-compose.dev.yml \
  build cvat_ui cvat_server

docker compose -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f components/serverless/docker-compose.serverless.yml \
  -f tests/docker-compose.email.yml \
  -f docker-compose.dev.yml \
  up -d

echo "⏳ Waiting for Nuclio Dashboard to be ready..."
until curl -s http://localhost:8070 > /dev/null; do
  echo "  ...still waiting for http://localhost:8070"
  sleep 3
done

echo "✅ Nuclio Dashboard is ready."

echo "🔨 Building optimized unified images..."
echo "  → Building unified PyTorch image (ONE image for ALL PyTorch models)..."
docker build -t pytorch-unified:cuda12.8 -f serverless/Dockerfile-pytorch-unified serverless

echo "  → Building unified Anomalib image (ONE image for ALL Anomalib models)..."
docker build -t anomalib-base:ubuntu22.04 -f serverless/pytorch/anomalib/Dockerfile-gpu serverless/pytorch/anomalib

# Note: No individual model images needed!
# GLASS and U2Net will both use pytorch-unified:cuda12.8
# All 10 Anomalib models will use anomalib-base:ubuntu22.04

echo "🚀 Deploying CPU-based Nuclio functions..."
./serverless/deploy_array_cpu.sh serverless/cpu_functions.txt

echo "🚀 Deploying GPU-based Nuclio functions..."
./serverless/deploy_array_gpu_cuda12.8.sh serverless/gpu_functions.txt

echo "🚀 Deploying Anomalib (GPU ready) Nuclio functions..."
./serverless/deploy_anomalib_gpu.sh serverless/pytorch/anomalib/models/nuclio

echo "✅ All functions deployed. CVAT is ready to use."
echo ""
echo "📊 Unified image sizes (shared by multiple functions):"
docker images | grep -E "pytorch-unified|anomalib-base" | awk '{print $1":"$2" - "$7$8}'
echo ""
echo "💡 Note: All PyTorch models (GLASS, U2Net) share pytorch-unified:cuda12.8"
echo "💡 Note: All Anomalib models (10 models) share anomalib-base:ubuntu22.04"
