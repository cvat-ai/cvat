# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added


### Changed


### Fixed

=======

## [2.0.0] - 2026-01-26

### Added
- Created API export file. [PR #23]
- Added all possible anomalib models for detection. [PR #24]
- Email configuration support through environment variables for SMTP authentication and user verification. [PR #25]
- GPU acceleration support for all 11 Anomalib models with dedicated deployment script and configuration files. [PR #26]
- GPU-enabled startup script for complete CVAT infrastructure deployment with GPU-accelerated Anomalib functions. [PR #26]
- YOLOv8 segmentation model detection with ONNX runtime support for both CPU and GPU deployment. [PR #27]
- CUDA 12.8 support for GLASS and U2Net models with dedicated GPU configurations and deployment scripts. [PR #28]
- GPU-enabled startup script (startup-gpu-cuda12.8.sh) for CUDA 12.8 infrastructure deployment. [PR #28]
- Set typing-extensions<4.9 for transT to be compatible with python 3.8 [PR #30]
- Unified Dockerfile for PyTorch models to streamline deployment of GLASS, U2Net, and other PyTorch-based serverless functions. [PR #31]
- Optimized GPU startup script (startup-gpu-cuda12.8-optimized.sh) for faster CUDA 12.8 infrastructure deployment. [PR #31]
- Add YOLOv11 speed sign detection model with GPU support for CUDA 12.8. [PR #32]
- Add YOLOv11 street light detection model with GPU support for CUDA 12.8. [PR #33]
- Integrate ClearML into CVAT UI [PR #34]
- Use checkpoint from interface in U2Net model [Pr #35]
- Allow indicating checkpoint path from the interface for onnx models. [PR #36]

### Changed
- Updated files to utilize environment variables. [PR #22]
- Enhanced docker-compose.override.yml and example.env to load email settings from environment variables with fallback defaults. [PR #25]
- Enhanced Anomalib functions with GPU resource allocation and CUDA 12.8 support for improved inference performance. [PR #26]
- Enhanced ModelHandler in GLASS and U2Net to support custom checkpoint paths in inference. [PR #28]
- Unified Docker images for PyTorch models (GLASS, U2Net) to reduce redundancy and improve maintainability. [PR #31]
- Optimized Anomalib GPU Docker image size for improved build times and resource efficiency. [PR #31]
- Enhanced docker-compose.dev.yml for better integration with unified PyTorch serverless functions. [PR #31]
- Updated GLASS and U2Net function configurations to use unified Docker base image with CUDA 12.8 support. [PR #31]

### Fixed
- Fixed Task creating changing cvat base docker image to version v2.35.0 [PR #21]
- Fixed SITE_ID type conversion issue in email_settings.py that was causing container restart problems. [PR #25]
- Fixed dependencies issues with CUDA 12.8 for YOLOv8 segmentation model detection with ONNX runtime. [PR #29]
- Fix error creating cvat_server image due to incompatibilities between datumaro and cargo dependencies. [PR #36]

=======

## [1.1.0] - 2025-07-01

### Added
- Created script to upload data to cvat via the CVAT API [PR #7]
- Created docker-compose.override.yml file, in this case to mount folders on cvat [PR #8]
- Add ports for default tracking models TransT and SiamMask [PR #10]
- U2Net model [PR #16]

### Changed
- Modified startup.sh to support docker-compose.override.yml file [PR #9]
- - Modified email configuration to support sending email invitations and email confirmation on sign up [PR # 12]
- Modified serverless/pyrotch/anomalib to support having one image for all anomalib functions [PR #14]
- Modified UI, backend and function containers to use inference checkpoints from anywhere in /data directory [PR #15]

### Fixed
- Fix path to anomalib nuclio functions [PR #17]

=======

## [1.0.0] - 2025-05-12

### Added
- GLASS model for MVTec leather [PR #1]
- CFA model and anomalib forked repo [PR #2]
- Uflow [PR #3]
- Patchcore [PR #4]
- Models on startup [PR #5]
Created startup.sh file which builds CVAT container and all nuclio functions listed in serverless/cpu_functions.txt andserverless/gpu_functions.txt. Created deploy_array_cpu.sh and deploy_array_gpu.sh bash files that serve the same purpose as orignal deploy_array_{}.sh but take as argument a .txt file with all function paths.

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
