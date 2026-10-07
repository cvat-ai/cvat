---
title: 'Quality control'
linkTitle: 'Quality control'
weight: 1
description: 'Overview of quality control features'
aliases:
  - /docs/manual/basics/quality-control/
---

CVAT has the following features for automated quality control of annotations:
- [Validation set configuration for a task](#how-to-enable-quality-control)
- Job validation on job finish ({{< ilink "/docs/qa-analytics/immediate-feedback" "Immediate feedback" >}})
- [Review mode for problems found](#how-to-review-problems-found)
- [Quality analytics](#how-to-check-task-quality-metrics)

In this section, we highlight only the key steps in quality estimation.
Consult the detailed guide on quality estimation in CVAT in the
{{< ilink "/docs/qa-analytics/auto-qa" "Advanced section" >}}.

## How to enable quality control

{{< tabpane text=true >}}

{{%tab header="In a new task" %}}

1. Go to task creation
1. Select the source media, configure other task parameters
1. Scroll down to the **Quality Control** section
1. Select one of the
   {{< ilink "/docs/qa-analytics/auto-qa#validation-modes" "validation modes" >}} available

   ![Create task with validation mode](/images/honeypot09.jpg)

1. Create the task
1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance` stage and `completed` state

  ![Set job status](/images/honeypot10.webp)

{{% /tab %}}

{{%tab header="In an existing task" %}}

{{% alert title="Note" color="primary" %}}
For already existing tasks only the Ground Truth validation mode is available. If you want
to use Honeypots for your task, you will need to recreate the task.
{{% /alert %}}

1. Open the task page
1. Select the `+` button next to the job list

   ![Create job](/images/honeypot01.webp)

1. Select Job Type **Ground truth** and configure the job parameters

   ![Configure job parameters](/images/honeypot02.webp)

1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance`stage and `completed` state

   ![Set job status](/images/honeypot10.webp)

{{% /tab %}}

{{< /tabpane >}}

## How to enable immediate job feedback

{{< product-badge "online,enterprise" >}}

{{% alert title="Note" color="primary" %}}
This feature requires a configured validation set in the task. Learn more
in [How to enable quality control](#how-to-enable-quality-control) and in the
{{< ilink "/docs/qa-analytics/auto-qa#configuring-quality-estimation" "full guide" >}}.
{{% /alert %}}

1. Open the task **Actions** menu > **Quality control** > **Settings**
1. Set **Max validations per job** to above zero. 3 is a good starting number

   ![Configure job validations](/images/immediate-feedback-quality-settings.png)

1. Save the updated settings
1. Assign an annotator to an annotation job
1. Annotate the job
1. Mark the job finished using the corresponding button in the menu
1. Once the job is completed, you'll see the job validation dialog

  <img src="/images/immediate-feedback-accept.png" style="max-width: 500px;">

Each assignee gets no more than the specified number of validation attempts.

Learn more about this functionality in the
{{< ilink "/docs/qa-analytics/immediate-feedback" "Immediate Feedback" >}} section.

## How to check task quality metrics

{{< product-badge "online,enterprise" >}}

1. Open the task **Actions** menu > **Quality control**
1. (Optional) Request quality metrics computation, and wait for completion
1. Review summaries or detailed reports

   ![Quality Analytics page](/images/honeypot05.png)

Learn more about this functionality
{{< ilink "/docs/qa-analytics/auto-qa#quality-analytics" "here" >}}.

## How to review problems found

{{< product-badge "online,enterprise" >}}

1. Open the task **Actions** menu > **Quality control**
1. Find an annotation job to be reviewed, it must have at least 1 validation frame
1. Select the job link
1. Switch to the **Review** mode
1. Enable display of Ground Truth annotations and conflicts

  ![GT conflict](/images/honeypot06.gif)

Learn more about this functionality
{{< ilink "/docs/qa-analytics/auto-qa#reviewing-gt-conflicts" "here" >}}.


## Audio interval quality

Audio tasks support quality requirements for **Interval** annotations with a Ground Truth
job. Enable **Base interval**, or create a child requirement,
and configure the IoU threshold, metric, required score, filters, and attribute comparison.

Intervals are matched one-to-one using temporal intersection over union (IoU), prioritizing
pairs with the same label. Attribute comparison can prevent a pair from matching. IoU is a
matching threshold, not the final quality score: a single correct pair with IoU 0.8 and a
threshold of 0.5 has accuracy 1.0. Intervals that only touch, or have zero duration, never match.
An open interval (`stop=null`) extends to the end of the recording for quality comparison;
the saved annotation is not changed. For different job and GT segments, only their overlapping
time range is compared. Intervals crossing its boundaries are clipped for comparison, while
intervals outside it are excluded. Disjoint segments have no comparison scope or score;
the job is reported as not checkable.

Filters support the annotation type, label, source, and user attributes. Group identifiers
do not combine intervals. Sampled Ground Truth, excluded time ranges, transcription metrics
such as WER/CER, and conflicts overlaid on the waveform are not supported.

Audio reports contain missing, extra, and mismatching-label conflicts with links to their
source intervals. They have no frame results; Ground Truth coverage is their shared time range.
Job, task, and project scores use the same requirement metrics as other annotation types.
An empty selection has `not_computed` status and no numeric score, following the existing
quality requirement completion rules.

### Report format versions

The report API exposes a read-only `version` field stored separately from the report payload.
Historical reports initially have a null database version. Their version is determined and
cached on first access without rewriting their JSON. Unrecognized or malformed payloads are
marked with version `0` to avoid repeated detection and are excluded from the default report
listing. Before filtering and paginating the default list, unknown versions are resolved only
within the reports allowed by permissions and the request filters. The first list request may
therefore take longer, especially without a task or project filter. Versions 2 and 3 also include `version`
at the top level of downloaded report data:

- **1:** historical reports predating Quality Requirements. Stored data may have no version.
- **2:** generalized Quality Requirements reports using frame-based results. Historical
  unversioned reports with a top-level `groups` field belong to this version.
- **3:** reports supporting comparison scopes independent of frames. All newly calculated
  reports, including 2D reports, use this version.

Versions 2 and 3 are listed by default; `include_legacy=true` also includes version 1.
Downloading an existing report preserves its version. Calculating a version 3 project report
recalculates tasks whose available reports are version 2; existing reports remain unchanged.
Version 3 includes `comparison_summary.has_comparison_scope`. For audio, a valid comparison
scope can exist even when `validation_frames` is zero, and conflicts have `frame_id=null`.
