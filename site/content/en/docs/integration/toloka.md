---
title: 'Toloka'
linkTitle: 'Toloka'
weight: 2
---

To have your dataset annotated through Toloka, simply establish
a project in CVAT set the pricing, and let Toloka annotators
take care of the annotations for you.

See:

- [Glossary](#glossary)
- [Preconditions](#preconditions)
- [Creating Toloka project](#creating-toloka-project)
- [Adding tasks and jobs to the Toloka project](#adding-tasks-and-jobs-to-the-toloka-project)
- [Adding instructions for annotators to the Toloka project](#adding-instructions-for-annotators-to-the-toloka-project)
- [Toloka pool setup](#toloka-pool-setup)
- [Changing Toloka pool](#changing-toloka-pool)
- [Reviewing annotated jobs](#reviewing-annotated-jobs)
  - [Accepting job](#accepting-job)
  - [Rejecting job](#rejecting-job)
- [Moving Toloka project to archive](#moving-toloka-project-to-archive)

## Glossary

This page contains several terms used to describe interactions between systems and actors.
Refer to the table below for clarity on how we define and use them.

<!--lint disable maximum-line-length-->

| Term      | Explanation                                                                                                                                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toloka    | Toloka  is a crowdsourcing platform that allows users to assign tasks to a broad group of participants, often termed "crowd workers". In the context of this article, when we mention Toloka, we are specifically referring to one of its UI interfaces. |
| CVAT      | CVAT, developed by OpenCV, is a tool designed for annotating video and image data for computer vision tasks. In this article's context, when we reference CVAT, we mean one of its UI interfaces.                                                               |
| Requester | An individual who establishes an annotation project within CVAT determines the price, creates tasks and jobs within the project, and then releases it on Toloka.                                                                                        |
| Toloker   |  A person who annotates the Requester's dataset. |

<!--lint enable maximum-line-length-->

## Preconditions

Actor: Requester.

Requester must have a [CVAT account](/docs/manual/basics/registration/)
and [Toloka Requester account](https://platform.toloka.ai/auth?role=REQUESTER&retpath=%2Fsignup%2Frequester).

## Creating Toloka project

The requester can set up a project within CVAT and subsequently
connect it to Toloka, making it accessible for annotations by Tolokers.

To initiate your Toloka project, proceed with the following steps:

1. [Log in to CVAT](/docs/manual/basics/registration/#account-access)
   and [initiate a new Project](/docs/manual/advanced/projects/).
2. Navigate to the project page and select **Actions** > **Setup crowdsourcing project**.

   ![Setting Up Toloka Project](/images/toloka01.png)

3. Fill in the following fields in the **Setup crowdsourcing project** form:

   ![Toloka Project Configuration](/images/toloka02.png)

   - **Provider**: Choose Toloka as your provider.
   - **Environment**: Select either **Sandbox** for a testing environment or **Production** for a live environment.
   - **API key**: Enter the [Requester API key](https://toloka.ai/docs/toloka-kit/registration/).
   - **Project description** (Optional): Provide a brief description of your project.

4. Click **Submit**.
   A pop-up indicating **Toloka Project Created** will appear, along with the **Update project** form.

   ![Project Update Form](/images/toloka03.png)

   - ![Open Project in Toloka](/images/toloka04.png) will take you to the published project in Toloka.
   - ![Open Project in CVAT](/images/toloka05.png) will take you back to the project in CVAT.

In CVAT, all projects related to Toloka will be labeled as **Toloka**.

![Toloka Label on Project](/images/toloka06.png)

## Adding tasks and jobs to the Toloka project

To add tasks to the Toloka project,
see [**Create annotation task**](/docs/manual/basics/create_an_annotation_task/#create-a-task).

On step 2 of the **Create annotation task** procedure,
from the drop-down list, select your Toloka project.

![Toloka Add Task](/images/toloka07.jpg)

## Adding instructions for annotators to the Toloka project

To add instructions for annotators to the Toloka project,
see [**Adding specification to Project**](/docs/manual/advanced/specification/#adding-specification-to-project)
documentation or [**Adding instructions**](https://www.youtube.com/embed/hAN9UGRvwOk)
video tutorial.

## Toloka pool setup

After creating a task and its associated jobs in
CVAT, you'll need to configure a Toloka pool,
specifying all task requirements and setting the price for task completion.

To set up the Toloka pool, do the following:

1. Open Toloka task, go to **Actions** > **Setup Toloka pool**.

   ![Set up Toloka pool](/images/toloka08.jpg)

2. In the **Create crowdsourcing task** form, fill in the following fields:

   ![Set up Toloka pool](/images/toloka09.jpg)

   - **Price per job**: Specify the payment amount for completing
     one job within the project.
   - **Use project description**: Switch this toggle if you want
     to use the overarching project description for individual tasks.
   - **Description**: Provide details about the pool.
     This field is visible only when the **Use project description** toggle is off.
   - **Sensible content**: Switch this toggle if your dataset
     contains images intended for an adult audience.
   - **Accept solutions automatically**: Enable this if you
     wish for completed jobs to be automatically accepted.
   - **Close pool after completion, sec**: Enter the time limit, in seconds,
     within which each job should be completed. You can also click on the
     field to select from one of the predefined periods.
   - **Time per task suite, sec**: Enter the time allowed for completing a task suite,
     in seconds. Uncompleted tasks are redistributed to other Tolokers.
   - **Days for manual review by requester**: Specify the Review period in days —
     the number of days for the review (from 1 to 21 days from the task completion date).
     The Toloker will see the deadline in the task information on the main Toloka page.
   - **Audience**: Add rules to make jobs available only to Tolokers who meet certain criteria.
     For example, you might require Tolokers to be proficient in English and have higher education.
     These rules operate based on filter principles. For more information,
     see [Filters](http://localhost:1313/docs/manual/advanced/filter/) documentation
     or [CVAT Filters](https://www.youtube.com/watch?v=lj6KLIFn24A) video tutorial.
   - ![Toloka Rules](/images/toloka10.jpg)

3. Click **Submit**. You will see the **Toloka task was created** pop-up and the **Update pool** form.

   ![Update pool](/images/toloka11.jpg)

   - ![Open pool in Toloka](/images/toloka04.png) opens pool in Toloka.
   - ![Open task in CVAT](/images/toloka05.png) opens task in CVAT.

4. Open Toloka task, go to **Actions** > **Start Toloka pool**.
   <br>Project, that you created will show up in Toloka.</br>

   ![Toloka Project](/images/toloka12.jpg)

## Changing Toloka pool

To change started Toloka pool, you need to stop it first.

1. Open Toloka task, **Actions** > **Stop Toloka pool**.
2. Implement changes.
3. Open Toloka task, go to **Actions** > **Start Toloka pool**.

## Reviewing annotated jobs

In case the jobs you've created are not in the **Accept solutions automatically**
mode, you will need to manually review and accept them
within time limits that were defined in the Toloka pool settings.

To approve or reject the job, use the **Accept** and **Reject** buttons.

![Toloka Project](/images/toloka13.jpg)

### Accepting job

To accept the annotated job, do the following:

1. Go to the Toloka task and open the job.
2. Review the result of annotation and in case all is fine, on the top menu,
   click **Accept**.
3. Optionally, you may add comment.

   ![Toloka Project](/images/toloka14.jpg)

4. Click **OK**.

### Rejecting job

To reject the annotated job, do the following:

1. Go to the Toloka task and open the job.
   <br>On the top menu, you will see **Accept** and **Reject** buttons.
   ![Toloka Project](/images/toloka13.jpg)

2. Review the result of the annotation and in case something is wrong,
   on the top menu, click **Reject**.
3. Add comment why this work was rejected

   ![Toloka Project](/images/toloka15.jpg)

4. Click **OK**.

After you reject the job, the menu bar will change and only the **Accept**
button will be active, so you can accept the job when changes are made.

## Moving Toloka project to archive

After annotation is completed, you can move the Toloka project to the archive.

> Note that all jobs must be complete.

1. Open Toloka project, go to **Actions** > **Archive Toloka project**.

   ![Toloka Project](/images/toloka16.jpg)

2. In the pop-up, click **Yes**.
