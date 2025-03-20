---
title: 'Consensus-based annotation'
linkTitle: 'Consensus'
weight: 4
description: 'Annotate the same data several times to get better annotations'
---

With CVAT you can annotate the same data several times and then
merge annotations automatically to obtain more reliable annotations.

> **Note** that consensus merging only supports
> 2d tasks. It supports all the annotation types except 2d cuboids.

> **Note** that consensus merging is currently available for tasks and jobs.

CVAT has the following features related to consensus-based annotation:
- Creation of **consensus replica** jobs for regular annotation jobs in a task
- Automatic merging for annotations inside **consensus replica** jobs

## Basics

If you want to improve quality of your annotations, there are several widespread ways
to achieve this. One of the methods is called *consensus-based annotation* or just *consensus*.
In this method, the same data is annotated several times. Once there are several different
annotations ("opinions") for the same objects, they can be merged in order to obtain
annotations of higher quality.

Let's consider an explanatory example. Imagine there is a group of people,
and you are asking them whether something is true or not. There are several
possible combinations of votes, including all the votes only for one of the options.
Typically, if you don't know the correct answer, you'd probably simply trust
the most voted option. This is called *majority voting* - and it requires
such majority to exist, so in general, it's desirable to have an odd number
of people in the group. If there is an even number of votes for both options,
you don't have enough information to prefer one of the options to the other.
With larger groups the method becomes less sensitive to this requirement,
as when the voters are independent and the question is meaningful,
the answers are less likely to separate evenly between the possible options.

Returning back to datasets, it works very similar to the example above. Each image
is annotated several times, typically by different persons, and then the resulting
annotations are compared and merged using majority voting or some other strategy.

Datasets, typically, have a big number of images and objects. This method of annotation,
requires several different annotations for the dataset, so it is expected to have
several times of the annotation costs compared to the simple single-annotation approach,
while dataset annotation is not cheap. The question arises how to apply this method efficiently.
One application for this approach that can be recommended is Ground Truth annotation.
This type of annotations typically requires especially high quality annotations and
includes a small portion of the whole dataset images (e.g. 3%).
If we apply 3- or 5-fold *consensus* to GT annotations, we can get reliable GT annotations
for 10-15% full dataset annotation cost. Now, this idea actually looks interesting. Once
you have such a reliable GT dataset, it can be used for the remaining dataset validation,
as regular.

## Consensus replica jobs

A **Consensus Replica job** (replica) is a way in CVAT to represent one of
the annotator "opinions". It works similarly to regular annotation jobs, but
there can be several *replicas* connected to each regular annotation job. When
you decide to merge annotation in replicas, the results will be written to the
parent regular job.

Key properties related to consensus replica jobs:
- replicas are not included in task annotation import or export.
  Per-job import and export still works for any job types
- replicas use the same frame range as their parent annotation jobs
- only annotation jobs can have replicas

Read more about merging [here](#how-to-merge-all-replicas-in-a-task).

## Workflow

When annotating with consensus, the typical workflow looks this way:

1. Create a task with consensus enabled. Optionally,
  {{< ilink "/docs/manual/basics/create_an_annotation_task" "configure validation" >}}
2. Assign annotators to consensus replicas, wait until all the jobs are completed
3. Once all replicas in a parent job are completed, merge annotations
4. Review and resolve problems in the parent jobs

### How to enable consensus in a task

Consensus annotation is configured on the Task level. It is only available at task creation.
If you want to enable consensus for one of your existing tasks, you'll need to recreate the task.

1. Go to the {{< ilink "/docs/manual/basics/create_an_annotation_task" "task creation" >}} page
2. Configure basic and advanced parameters according to your requirements,
  and attach a dataset to be annotated.
3. To enable consensus for the task, open the **Advanced** section and
  set **Consensus Replicas** to above 1.

  ![Consensus replicas parameter image](/images/consensus-replicas-task-parameter.jpg)

4. Create the task and open the task page

If a task has consensus enabled, you'll see **Consensus** tag in the task summary.
Existing **Consensus replica** jobs will be displayed in the jobs list under their parent
annotation jobs.

  ![Consensus replica jobs in the task job list](/images/consensus-replicas-list-task.jpg)

### Merging

For a given parent task with related annotated consensus jobs, merging will
match annotations between replicas and save merged annotations into the parent job.

> Please note that the **merging overrides annotations in the parent job**.
> This operation cannot be undone. Please make sure that the parent job
> is ready for merging and backup annotations if needed.

There are 2 merging options available:
- merge replicas in all available parent jobs in a task
- merge replicas in a specific parent job

Merging is only available for a parent job if it is on the **annotation** stage and
it has at least 1 replica not in the **annotation** stage and **new** state.
For simplicity, this can be read as "if there are any annotated replicas in the parent job".

After merging, parent jobs are switched to the **completed** state automatically.
If you prefer using merging at the task level, it is recommended to switch merged
parent jobs to the **validation** stage after they are merged to exclude them from
the next merging and avoid losing the reviewed annotations.

### How to merge all replicas in a task

1. Open the task **Actions** menu
2. Click **Merge consensus jobs**

  ![Task actions menu](/images/consensus-merge-task-jobs-button.jpg)

3. Click **Merge** in the dialog window

  ![Consensus merge dialog](/images/consensus-merge-task-dialog.jpg)

  The operation can take some time to be completed. Once it is completed, you will
  receive a status notification in the top right corner.

### How to merge replicas in a specific parent job

1. Open the job **Actions** menu
2. Click **Merge consensus job**

  ![Job actions menu](/images/consensus-merge-job-actions.jpg)

3. Click **Merge** in the dialog window

  ![Consensus merge dialog](/images/consensus-merge-job-dialog.jpg)

  The operation can take some time to be completed. Once it is completed, you will
  receive a status notification in the top right corner.

## Configuration

### Merging settings

If you want to tweak some aspects of merging, you can do this on the
**Consensus Management** page. It is available in the task **Actions** menu.
Hover over the **?** marks to understand what each field represents.

After you set values for the parameters, click **Save** button.
The updated settings will take effect on the next merging.

![Consensus settings page](/images/consensus-settings.jpg)

The following parameters are available:

<!--lint disable maximum-line-length-->

| **Parameter** | **Description** |
| - | - |
| _General_ |
| Quorum | The minimum percent of replicas having an annotation to be included in the results. The number is rounded up to get the job count. For instance, if there are 5 replicas in a parent job and quorum is 70%, an annotation will be included in the results only if it has ceil(5 * 0.7) = 4 votes from replicas. |

| _Shape matching_ | |
| - | - |
| Min overlap | Min overlap threshold used for the distinction between matched and unmatched annotations. Used to match all types of annotations. It corresponds to the Intersection over union (IoU) for spatial annotations, such as bounding boxes and masks. Read more about annotation matching {{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#comparisons" "here" >}}. Keep in mind that quality settings do not affect consensus merging. |

<!--lint enable maximum-line-length-->
