---
title: 'Consensus-based annotation'
linkTitle: 'Consensus'
weight: 4
description: 'Annotate the same data several times to get better annotations'
aliases:
  - /docs/manual/advanced/analytics-and-monitoring/consensus/
---

With CVAT you can annotate the same data several times and then
merge annotations automatically to obtain more reliable annotations.

{{% alert title="Note" color="primary" %}}
Consensus merging only supports 2D tasks.
It supports all annotation types except cuboids.
{{% /alert %}}

{{% alert title="Note" color="primary" %}}
Consensus merging is currently available only for tasks and jobs.
Projects are not supported.
{{% /alert %}}

CVAT has the following features related to consensus-based annotation:
- Creation of **consensus replica** jobs for regular annotation jobs in a task
- Automatic merging for annotations inside **consensus replica** jobs

## Basics

If you want to improve the quality of your annotations, there are several widespread ways
to achieve this. One of the methods is called _consensus-based annotation_ or just _consensus_.
In this method, the same data is annotated several times. Once there are several different
annotations ("opinions") for the same objects, they can be merged in order to obtain
annotations of higher quality.

Let's consider an explanatory example. Imagine there is a group of people and
you want to learn whether something is true or not from them.
To accomplish this, you decided to ask everyone and pick the most popular answer in the end.
With such an idea, you can get many possible combinations of votes, including unanimous ones.
This strategy is called _majority voting_ - and it requires such a majority to exist.
If there is an even number of votes for both options,
you don't have enough information to prefer one of the options to the other,
so, in general, it's desirable to have an odd number of people in the group.
With larger groups the method becomes less sensitive to this requirement,
as when the voters are independent and the question is meaningful,
the answers are less likely to separate evenly between the possible options.
This method can also be used if the question has more than 2 possible answers. In this case,
there are more possible distributions of the votes, but the same logic can be applied.

Returning back to datasets, consensus annotation works very similar to the example above.
Each image is annotated several times, typically by different persons, then the resulting
annotations are compared between each other and merged, using majority voting or
a different strategy. The key advantage of consensus annotation is that it helps to reduce
personal annotator bias in annotation. This improves the quality of annotation by filtering out
errors, noise (variance) and outliers in the annotation, leaving only the most representative
ones.

Datasets, typically, have a large number of images and objects. This method of annotation
requires several different annotations for the whole dataset, so it is expected to have
several times of the annotation costs compared to the simple single-annotation approach.
Depending on the annotation resources available, budget, and requirements,
consensus annotation may or may not be feasible in a particular task.

One application for this approach that can be recommended is Ground Truth annotation.
This type of annotation typically requires especially high quality annotations, because
it is used to validate model or annotator answers. Ground Truth is typically limited
only to a small portion of the whole dataset images, for example 3%.
If a 3- or 5-fold _consensus_ is applied to GT annotations, it is possible to obtain
more reliable GT annotations for 10-15% of the full dataset annotation cost.
Once there is such a reliable GT dataset, it can be used for
{{< ilink "/docs/qa-analytics/auto-qa" "annotator validation" >}},
on the remaining dataset ensuring the quality metrics are representative and objective.

## Consensus replica jobs

A **Consensus Replica job** (_replica_) is the way to represent one of
the annotator "opinions" in CVAT. _Consensus replicas_ work similarly to regular
annotation jobs - they can be assigned, annotated, imported and exported.
When you decide to merge annotations from replicas, the results will be written to the
parent annotation job.


Key properties of consensus replica jobs:
- _Replicas_ are connected to annotation jobs. Each annotation job can have
  several related _replicas_.
- Only annotation jobs can have replicas. Ground Truth jobs cannot have replicas.
- Replicas use the same frame range as their parent annotation jobs.
- Annotations in replicas and parent jobs are independent from each other.
  Modifying a replica doesn't affect the parent job or other replicas and vice versa.
  Removing annotations in a parent job doesn't change annotations in its replicas.
- Replicas are not included in _task_ annotation import or export.
  _Per-job_ import and export still work for all job types, including replicas.

Read more about merging [here](#how-to-merge-all-replicas-in-a-task).

## Workflow

When annotating with consensus, the typical workflow looks this way:

1. Create a task with consensus enabled. Optionally,
  {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "configure validation" >}}
1. Assign annotators to consensus replicas, wait until all the jobs are completed
1. Once all replicas in a parent job are completed, merge annotations
1. Review and resolve problems in the parent jobs

### How to enable consensus in a task

Consensus annotation is configured at the Task level. It can only be specified at task creation.
If you want to enable consensus for one of your existing tasks, you'll need to recreate the task.

1. Go to the {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "task creation" >}} page
1. Configure basic and advanced parameters according to your requirements,
  and attach a dataset to be annotated.
1. To enable consensus for the task, open the **Advanced** section and
  set **Consensus Replicas** to a value greater than 1.

  ![Consensus replicas parameter image](/images/consensus-replicas-task-parameter.png)

1. Create the task and open the task page

If a task has consensus enabled, you'll see the **Consensus** tag in the task summary.
Existing **Consensus replica** jobs will be displayed in the job list under their parent
annotation jobs.

  ![Consensus replica jobs in the task job list](/images/consensus-replicas-list-task.png)

### Merging

For a given parent job with related annotated consensus jobs, merging will
match annotations between the replicas and save merged annotations into the parent job.

{{% alert title="Warning" color="warning" %}}
Please note that **merging overrides annotations in the parent job**.
This operation cannot be undone. Please make sure that the parent job
is ready for merging and backup annotations if needed.
{{% /alert %}}

There are 2 merging options available:
- merge replicas in all available parent jobs in a task
- merge replicas in a specific parent job

Merging is only available for a parent job if it is in the **annotation** stage and
it has at least 1 replica not in the **annotation** - **new** stage and state.
For simplicity, this can be read as "if there are any annotated replicas in the parent job".

After merging, parent jobs are switched to the **completed** state automatically.
If you prefer merging at the task level, it is recommended to switch merged
parent jobs to the **validation** stage after they are merged to exclude them from
the next merging and avoid losing the reviewed annotations.

### How to merge all replicas in a task

1. Open the task **Actions** menu
1. Click **Merge consensus jobs**

  ![Task actions menu](/images/consensus-merge-task-jobs-button.png)

1. Click **Merge** in the dialog window

  ![Consensus merge dialog](/images/consensus-merge-task-dialog.png)

  The operation can take some time to be completed. Once it is completed, you will
  receive a status notification in the top right corner.

### How to merge replicas in a specific parent job

1. Open the job **Actions** menu
1. Click **Merge consensus job**

  ![Job actions menu](/images/consensus-merge-job-actions.png)

1. Click **Merge** in the dialog window

  ![Consensus merge dialog](/images/consensus-merge-job-dialog.png)

  The operation can take some time to be completed. Once it is completed, you will
  receive a status notification in the top right corner.

### Review and resolve problems

After merging replicas, the parent job will contain merged annotations with consensus scores.
These scores help you identify which annotations may need closer review.

#### Understanding consensus scores

Each merged annotation has two important properties:

- **Score**: A value from 0 to 1 that indicates the level of agreement between annotators.
  A score of 1.0 means all replicas agreed on this annotation, while lower scores indicate
  less agreement between annotators.
- **Votes**: An approximate number showing how many annotators agreed on this annotation.
  This is a UI-only value calculated as `replicas × score`. For example, with 5 replicas
  and a score of 0.8, the votes value would be approximately 4.

![Consensus score and votes on annotation page](/images/consensus-score-votes.png)

Annotations with lower scores may indicate:
- Ambiguous or difficult-to-annotate objects
- Inconsistent annotation guidelines
- Objects that need closer review

#### Filtering low-confidence annotations

Before starting manual review, you may want to filter out annotations with low scores
to reduce the review workload. To do this:

1. Open the merged parent job in the annotation view
1. Use the {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "filters panel" >}} to filter
annotations by score
1. Review the filtered annotations and delete those that don't meet your quality requirements
1. Save the annotations

{{% alert title="Note" color="primary" %}}
Deleting low-score annotations is optional. You may prefer to review all annotations
manually to ensure nothing valuable is removed.
{{% /alert %}}

#### Manual review process

Once filtering is complete (or if you skip filtering), proceed with manual review:

1. Open the merged parent job in the annotation view, enable review mode
1. Navigate through annotations using keyboard shortcuts:
   - **Tab**: Go to the next object
   - **Shift+Tab**: Go to the previous object
1. For each annotation, decide on one of the following actions:

   - **Accept the annotation**: If the annotation is correct, simply move to the next object
   - **Adjust the annotation**: If the annotation needs modifications:
     1. Press **L** to unlock the object
     1. Make necessary adjustments (resize, reposition, change attributes, etc.)
     1. Press **L** again to lock the object
     1. Move to the next object
   - **Delete the annotation**: If the annotation is completely wrong:
     1. Press **L** to unlock the object
     1. Press **Delete** or use the context menu to remove it
     1. Move to the next object

1. After reviewing all annotations, save your work using **Ctrl+S** (or **Cmd+S** on macOS)

## Configuration

### Merging settings

If you want to tweak some aspects of merging, you can do this on the
**Consensus Management** page. It is available in the task **Actions** menu.
Hover over the **?** marks to understand what each field represents.

After you set values for the parameters, click the **Save** button.
The updated settings will take effect on the next merging.

![Consensus settings page](/images/consensus-settings.png)

The following parameters are available:

| _Shape comparison_ | |
| - | - |
| Min overlap | Min overlap threshold used for the distinction between matched and unmatched annotations. Used to match all types of annotations. It corresponds to the Intersection over union (IoU) for spatial annotations, such as bounding boxes and masks. Read more about annotation matching {{< ilink "/docs/qa-analytics/auto-qa#comparisons" "here" >}}. Keep in mind that quality settings do not affect consensus merging. |
