# Optimized GLASS model image - builds on unified PyTorch base
# Only adds model-specific code, no dependency reinstallation

ARG BASE_IMAGE=pytorch-unified-base:cuda12.8
FROM ${BASE_IMAGE}

# Set working directory
WORKDIR /opt/nuclio

# Copy GLASS model code
COPY glass/ /opt/nuclio/glass/

# Copy handler files
COPY main.py model_handler.py /opt/nuclio/

# Verify installation
RUN python -c "import torch; print(f'PyTorch: {torch.__version__}, CUDA available: {torch.cuda.is_available()}')"

# Handler will be specified in function.yaml
CMD ["python", "main.py"]
