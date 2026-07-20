[![CVAT Community header](site/content/en/images/cvat_github_header.webp)](https://app.cvat.ai)
# CVAT: Computer Vision Annotation Tool

[![Release][release-img]][release-url]
[![GitHub stars][stars-img]][stars-url]
[![License][license-img]][license-url]
[![CI][ci-img]][ci-url]
[![server pulls][docker-server-pulls-img]][docker-server-image-url]
[![ui pulls][docker-ui-pulls-img]][docker-ui-image-url]
[![CVAT Online][online-img]][online-url]
[![CVAT Enterprise][enterprise-img]][enterprise-url]
[![Status][status-img]][status-url]
[![Discord][discord-img]][discord-url]
[![Docs][docs-img]][docs-url]

[Website](https://www.cvat.ai/) ·
[Docs](https://docs.cvat.ai/docs/) ·
[Changelog](https://www.cvat.ai/resources/changelog) ·
[Tutorials](https://www.cvat.ai/resources/videos) ·
[Academy](https://www.cvat.ai/resources/academy) ·
[Blog](https://www.cvat.ai/resources/blog)

## What is CVAT Community?

**CVAT Community** is the free, self-hosted open-source edition of [CVAT](https://www.cvat.ai/) — one of
the most widely used data annotation platforms for building high-quality visual datasets for
computer vision and visual AI.
Since 2018, CVAT has become one of the best-known data annotation tools in computer vision, with a
large open-source community, millions of Docker pulls, and broad adoption across research and
production AI teams.

CVAT Community supports image, video, and 3D annotation, dataset management, team collaboration, cloud storage
integration, developer-friendly SDKs and APIs, and gives your team full control over your data
and annotation infrastructure.
The platform serves as the foundation of
[CVAT Online](https://www.cvat.ai/pricing/cvat-online) and
[CVAT Enterprise](https://www.cvat.ai/enterprise), and is actively maintained by the CVAT engineering team.

Why teams choose CVAT Community:

- **Own your data:** Run entirely within your own infrastructure. No data leaves your environment.
- **AI-powered annotation:** Connect your own ML models for detection, segmentation, and tracking to speed up labeling.
- **Team collaboration:** Multi-user and multi-organization support with roles, task assignments,
  and review workflows.
- **MIT-licensed core:** Use, modify, and distribute CVAT Community under the permissive MIT License. Some serverless
assets and dependencies may have separate licenses.
- **Production-grade:** The foundation of all CVAT commercial products — battle-tested at scale.
- **True open-source:** Transparent development, active community, on GitHub since 2018.

This repository contains the source code and deployment assets for CVAT Community.

For a fully managed setup, annotation services, or enterprise features, see
[CVAT Online](https://www.cvat.ai/pricing/cvat-online),
[CVAT Enterprise](https://www.cvat.ai/enterprise) and
[CVAT Labeling Services](https://www.cvat.ai/annotation-services).

## Getting Started

> 💡 Want to explore CVAT before deploying anything?
> **[Try CVAT Online (Free plan)](https://app.cvat.ai)** directly in your browser.
> Feature availability and usage limits vary by plan; see
> [CVAT Online pricing](https://www.cvat.ai/pricing/cvat-online) for details.

### Installation

**Prerequisites:**

- [Docker Engine](https://docs.docker.com/engine/install/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)

> 💡 CVAT is primarily tested with Chromium-based browsers (Google Chrome, Microsoft Edge).
> Firefox may work with some caveats; Safari/WebKit is not supported.

**1. Start the default stack**

Clone the repository and launch the services.

```bash
git clone https://github.com/cvat-ai/cvat
cd cvat

# Optional: set your IP or domain
# export CVAT_HOST=your-ip-or-domain

docker compose up -d