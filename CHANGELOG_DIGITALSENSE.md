# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created script to upload data to cvat via the CVAT API [PR #7]
- Created docker-compose.override.yml file, in this case to mount folders on cvat [PR #8]
- Add ports for default tracking models TransT and SiamMask [PR #10]

## Changed
- Modified startup.sh to support docker-compose.override.yml file [PR #9]

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
