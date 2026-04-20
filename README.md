# CVAT: All-in-One Data Labeling Suite for Teams Building Real-World Vision AI

[![Release][release-img]][release-url]
[![GitHub stars][stars-img]][stars-url]
[![License][license-img]][license-url]
[![Docs][docs-img]][docs-url]
[![CI][ci-img]][ci-url]
[![CVAT Online][online-img]][online-url]
[![Status][status-img]][status-url]
[![CVAT Enterprise][enterprise-img]][enterprise-url]

Welcome to the official GitHub repository for CVAT (Computer Vision Annotation Tool).

CVAT is a platform for building high-quality visual datasets for computer vision and visual AI.
Backed by an active open-source community and trusted by thousands of teams worldwide, CVAT helps organizations
 and AI practitioners streamline data labeling for faster, more accurate model development.

## Key features

- **Manual and automated labeling:** Annotate with bounding boxes, polygons, masks, keypoints, and more,
or speed up the process with pre-trained and custom auto-labeling models.
- **Task management:** Split datasets into jobs, assign work, and track progress across your team in real time.
- **Collaboration:** Control who can view, annotate, and manage datasets, leave comments on labels, and
keep track of all changes with full audit trails.
- **Quality control:** Validate labels with GT datasets, consensus across annotators,
configurable thresholds, and confusion matrix reports.
- **Analytics:** Track annotation progress, team performance, and time spent per project and job.
- **Integrations:** Export to COCO, YOLO, Pascal VOC, TFRecord, Cityscapes, and 20+ formats, and
connect storage, models, and task trackers via API and SDK.

This repository covers **CVAT Community**, the free, self-hosted open-source edition of CVAT. For
more information about other solutions, their pricing, and features, use the official product pages below.

## Getting started with CVAT

CVAT offers a range of data annotation solutions with various deployment and automation options,
labeling tools, and levels of support.

### CVAT Community (Self-Hosted, Free)

If you want to run CVAT in your own environment, choose [CVAT Community](https://github.com/cvat-ai/cvat).
This repository contains the free, self-hosted open-source edition, that was designed for teams that want direct control
over deployment, infrastructure, integrations, and customization. It’s completely free and comes
with core labeling functionality, though some advanced features – e.g. SAM 3 support, SSO,
built-in analytics, quality control workflows, or AI agents – aren’t available.

### CVAT Online (SaaS, Free / Solo / Team)

If you need a fast way to evaluate the platform and its core capabilities, choose [CVAT Online](https://app.cvat.ai).
It is a cloud-hosted edition, so you can sign up and start labeling immediately in the browser
without spending extra time on infrastructure setup, storage configuration, or upgrades.

You can start free and upgrade later to the Solo or Team plan. See pricing details on the [CVAT Online pricing page](https://www.cvat.ai/pricing/cvat-online).

### CVAT Enterprise (Self-Hosted, Basic / Premium)

If you need private deployment with stronger operational, security, or compliance controls, as
well as all the extra features missing in CVAT Community, choose [CVAT Enterprise](https://www.cvat.ai/enterprise).

It is built for organizations that require advanced administration capabilities and commercial support.
The Enterprise edition comes in Basic and Premium plans. [Contact us](https://www.cvat.ai/sales)
to learn more about enterprise deployment and plan details.

### CVAT Labeling Services

If you do not have the time or capacity to label your data in-house, or want to outsource part of
it while keeping all the data in your CVAT instance, CVAT offers turnkey labeling services for
image, video, point cloud, and audio data.

Learn more about [CVAT Labeling Services](https://www.cvat.ai/annotation-services) or [contact us](https://www.cvat.ai/sales#services)
to share your project scope and timeline.

## Setting up CVAT Community

To run CVAT Community, you need Docker, Docker Compose, and Git.

The standard setup is straightforward:

1. Clone the repository and start the services using the commands from the [installation guide](https://docs.cvat.ai/docs/administration/community/basics/installation/).
2. Once the containers are up, create a superuser with the command shown in the docs, then
3. Open CVAT in the browser and sign in with the account you just created.

By default, CVAT runs at `localhost:8080`. If you want to access it from another machine or
domain, set `CVAT_HOST` before startup. If you want to install a specific release instead of the default version, set `CVAT_VERSION`.

Once your instance is running, you can create tasks, define labels, upload data, and start
annotating image, video, and 3D datasets in the browser. From there, you can move data in and out
in formats such as CVAT, COCO, YOLO, KITTI, and Cityscapes, or connect CVAT to your own pipeline
through the [REST API](https://docs.cvat.ai/docs/api_sdk/api/), [Python SDK](https://docs.cvat.ai/docs/api_sdk/sdk/),
and [CLI](https://docs.cvat.ai/docs/api_sdk/cli/).
The CLI covers project and task creation, dataset import and export, task backups, and local auto-annotation functions.

If you want automated annotation in Community, follow the [auto-annotation installation guide](https://docs.cvat.ai/docs/administration/community/advanced/installation_automatic_annotation/)
 to install the self-hosted automatic annotation components and add your own models. That setup
 uses additional serverless components and [nuctl](https://docs.nuclio.io/en/stable/reference/nuctl/nuctl.html),
 so it is different from the default `docker compose up -d` flow.

The default setup brings up the bundled services CVAT needs out of the box, including PostgreSQL
and Redis. If you are setting up something beyond the default local installation, use the docs
for the scenario you actually need: [AWS deployment](https://docs.cvat.ai/docs/administration/community/basics/aws-deployment-guide/),
[Kubernetes with Helm](https://docs.cvat.ai/docs/administration/community/advanced/k8s_deployment_with_helm/),
deployment with an external database, [backups](https://docs.cvat.ai/docs/administration/community/advanced/backup_guide/),
and [upgrades](https://docs.cvat.ai/docs/administration/community/advanced/upgrade_guide/).

## Community & Support

Support for CVAT Community is community-based through [GitHub issues](https://github.com/cvat-ai/cvat/issues) and [Discord](https://discord.gg/fNR3eXfk6C).
If you need dedicated support, response-time commitments, or more advanced deployment and
security features, consider migrating to [CVAT Enterprise](https://www.cvat.ai/enterprise).

For general installation, upgrades, and troubleshooting issues, use the [installation guide](https://docs.cvat.ai/docs/administration/community/basics/installation/)
and [FAQ](https://docs.cvat.ai/docs/faq/).

## Contributing

CVAT Community is actively maintained by the CVAT team and relies on contributions from the
open-source community. We welcome all contributions: bug reports, documentation fixes, integrations, and code.

- If you’d like to contribute to CVAT, please refer to our [contribution documentation](https://docs.cvat.ai/docs/contributing/).
- For bug reports or feature requests, please use the [GitHub Issues](https://github.com/cvat-ai/cvat/issues) tracker.

## License

CVAT is released under the MIT License. The code in the `/serverless` directory is also released
under the MIT License, but it may download or use third-party assets such as source code,
architectures, and model weights that are distributed under separate licenses, including
non-commercial licenses. Review those licenses before use.

This software uses FFmpeg libraries under LGPL/GPL terms.
See the [Dockerfile](https://github.com/cvat-ai/cvat/blob/develop/Dockerfile)
 and the [FFmpeg legal information](https://www.ffmpeg.org/legal.html) for details.

## Security

Please review the [Security Policy](https://github.com/cvat-ai/cvat/security/policy) before reporting vulnerabilities.
For sensitive issues, contact [secure@cvat.ai](mailto:secure@cvat.ai).

## Additional resources

For the latest product releases, feature walkthroughs, and blogs on computer vision and data labeling, check out our [Content Hub](https://www.cvat.ai/resources),
[YouTube](https://www.youtube.com/@cvat-ai), and [LinkedIn](https://www.linkedin.com/company/cvat-ai),
or sign up for our [newsletter](https://www.cvat.ai/#:~:text=Subscribe%20to%20the%20CVAT%20Newsletter).

  <!-- Badges -->

[ci-img]: https://github.com/cvat-ai/cvat/actions/workflows/main.yml/badge.svg?branch=develop
[ci-url]: https://github.com/cvat-ai/cvat/actions

[docs-img]: https://img.shields.io/badge/docs-docs.cvat.ai-blue?style=flat-square
[docs-url]: https://docs.cvat.ai

[online-img]: https://img.shields.io/badge/CVAT%20Online-app.cvat.ai-success?style=flat-square
[online-url]: https://app.cvat.ai

[release-img]: https://img.shields.io/github/v/release/cvat-ai/cvat?style=flat-square
[release-url]: https://github.com/cvat-ai/cvat/releases

[license-img]: https://img.shields.io/github/license/cvat-ai/cvat?style=flat-square
[license-url]: https://github.com/cvat-ai/cvat/blob/develop/LICENSE

[stars-img]: https://img.shields.io/github/stars/cvat-ai/cvat?style=flat-square
[stars-url]: https://github.com/cvat-ai/cvat/stargazers

[status-img]: https://uptime.betterstack.com/status-badges/v2/monitor/1yl3h.svg
[status-url]: https://status.cvat.ai

[enterprise-img]: https://img.shields.io/badge/CVAT%20Enterprise-cvat.ai-orange?style=flat-square
[enterprise-url]: https://www.cvat.ai/enterprise
