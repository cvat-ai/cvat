---
title: 'CVAT Complete Workflow Guide for Organizations'
linkTitle: 'CVAT Complete Workflow Guide for Organizations'
weight: 2
---

Welcome to CVAT.ai, this page is the place to start your team’s
annotation process using the Computer Vision Annotation Tool (CVAT).

This guide aims to equip your organization with the knowledge
and best practices needed to use CVAT effectively.

We'll walk you through every step of the CVAT workflow,
from initial setup to advanced features.

See:

- [Workflow diagram](#workflow-diagram)
- [End-to-end workflow for Organizations](#end-to-end-workflow-for-organizations)
- [Complete Workflow Guide video tutorial](#complete-workflow-guide-video-tutorial)

## Workflow diagram

The workflow diagram presents an overview of the general process at a high level.

[![Workflow diagram](/images/cvat-workflow-bpmn.png)](/images/cvat-workflow-bpmn.png)

## End-to-end workflow for Organizations

To use CVAT within your organization, please follow these steps:

1. [Create an account in CVAT](/docs/manual/basics/registration/).
2. [Create **Organization**](/docs/manual/advanced/organization/).
3. Switch to the **Organization** that you've
   created and [subscribe to the **Team plan**](/docs/enterprise/subscription-managment/#team-plan).
4. [Invite members to **Organization**](/docs/manual/advanced/organization/#invite-members-into-organization) and
   assign [User roles](/docs/manual/advanced/iam_user_roles/) to invited members.
5. [Create **Project**](/docs/manual/advanced/projects/).
6. (Optional) Attach [**Cloud storages**](/docs/manual/basics/attach-cloud-storage/) to the **Project**.
7. Create [**Task**](/docs/manual/basics/create_an_annotation_task/) or [
   **Multitask**](/docs/manual/basics/create-multi-tasks/).
   <br>At this step the CVAT platform will automatically create
   jobs.
8. (Optional) Create [**Ground truth job**](/docs/manual/advanced/analytics-and-monitoring/auto-qa/).
   <br>This step can be skipped if you're employing a manual QA approach.
9. (Optional) Add [**Instructions for annotators**](/docs/manual/advanced/specification/).
10. (Optional) Configure [**Webhooks**](/docs/administration/advanced/webhooks/).
11. Assign jobs to annotators by adding the annotator name to **Assignee** and
    changing the [**Job stage**](https://opencv.github.io/cvat/docs/manual/advanced/iam_user_roles/#job-stage)
    to **Annotation**.
12. Annotator will see assigned jobs and annotate them.
13. (Optional) In case you've created
    a [**Ground truth job**](/docs/manual/advanced/analytics-and-monitoring/auto-qa/)
    give the CVAT platform some time to accumulate the data and
    check the accuracy of the annotation.
14. If you are using the manual validation,
    assign jobs to validators by adding the validator name to **Assignee** and
    changing the [**Job stage**](https://opencv.github.io/cvat/docs/manual/advanced/iam_user_roles/#job-stage)
    to **Validation**.
15. Validator will see assigned jobs and report issues.
    <br>Note, that validators can correct issues,
    see [**Manual QA and Review**](/docs/manual/advanced/analytics-and-monitoring/manual-qa/)
16. Check issues and if there is a need for additional improvement, reassign jobs to
    either the Validator or Annotator.
17. (Optional) Check [**Analytics**](/docs/manual/advanced/analytics-and-monitoring/analytics-in-cloud/).
18. [**Export Data**](/docs/manual/advanced/formats/).

## Complete Workflow Guide video tutorial

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/uI2OEoR08ME?si=0OTHPwgxGx30Gax7" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
