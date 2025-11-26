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

## Configuration

### Merging settings

If you want to tweak some aspects of merging, you can do this on the
**Consensus Management** page. It is available in the task **Actions** menu.
Hover over the **?** marks to understand what each field represents.

After you set values for the parameters, click the **Save** button.
The updated settings will take effect on the next merging.

![Consensus settings page](/images/consensus-settings.png)

The following parameters are available:

| **Parameter** | **Description** |
| - | - |
| _General_ |
| Quorum | The minimum percentage of replicas that must contain an annotation for it to be included in the results. The number is rounded up to get the job count. For instance, if there are 5 replicas in a parent job and quorum is 70%, an annotation will be included in the results only if it has ceil(5 * 0.7) = 4 votes from replicas. |

| _Shape matching_ | |
| - | - |
| Min overlap | Min overlap threshold used for the distinction between matched and unmatched annotations. Used to match all types of annotations. It corresponds to the Intersection over union (IoU) for spatial annotations, such as bounding boxes and masks. Read more about annotation matching {{< ilink "/docs/qa-analytics/auto-qa#comparisons" "here" >}}. Keep in mind that quality settings do not affect consensus merging. |
