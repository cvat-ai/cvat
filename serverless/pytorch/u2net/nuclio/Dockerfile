# Optimized U2Net model image - builds on unified PyTorch base
# Only adds model-specific code, no dependency reinstallation

ARG BASE_IMAGE=pytorch-unified-base:cuda12.8
FROM ${BASE_IMAGE}

# Set working directory
WORKDIR /opt/nuclio

# Clone U2Net repository (model architecture)
RUN git clone --depth 1 https://github.com/xuebinqin/U-2-Net.git u2net && \
    rm -rf u2net/.git

# Copy handler files
COPY main.py model_handler.py /opt/nuclio/

# Verify installation
RUN python -c "import torch; print(f'PyTorch: {torch.__version__}, CUDA available: {torch.cuda.is_available()}')"

# Handler will be specified in function.yaml
CMD ["python", "main.py"]
