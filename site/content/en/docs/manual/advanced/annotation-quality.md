---
title: 'Annotation quality & Honeypot'
linkTitle: 'Annotation quality'
weight: 14
description: 'How to check the quality of annotation in CVAT'
---


In CVAT, it's possible to evaluate the quality of annotation through the creation of a **Ground truth** job, referred to as a Honeypot. CVAT compares all other jobs in the specified tasks against the established **Ground truth** job and calculates annotation quality based on this comparison.


See:

- [Ground truth job](#ground-truth-job)
- [Managing Ground Truth jobs: Import, Export, and Deletion](#managing-ground-truth-jobs-import-export-and-deletion)
  - [Import](#import)
  - [Export](#export)
  - [Delete](#delete)
- [Assessing data quality with Ground truth jobs](#assessing-data-quality-with-ground-truth-jobs)
  - [Quality data](#quality-data)
  - [Annotation quality settings](#annotation-quality-settings)
  - [GT conflicts in the CVAT interface](#gt-conflicts-in-the-cvat-interface)
- [Annotation quality \& Honeypot video tutorial](#annotation-quality--honeypot-video-tutorial)


## Ground truth job

You don’t need to annotate the whole dataset twice, the annotation quality of a small part of
the data will show the quality of annotation for the whole dataset.

You need to select several frames from the whole
dataset depending on the size of the task.

For the quality assurance to function properly, each job should contain at
least a few overlapping frames. For example, for **task that contains only
30 frames** to obtain adequate data, it's advisable to select **8-10 frames**.

Depending on the dataset size, **5-15% of the data is good enough** for quality estimation.

To create a **Ground truth** job, do the following:

1. Create a [task](/docs/manual/basics/create_an_annotation_task/), and open the task page.
2. Click **+**.

   ![Create job](/images/honeypot01.jpg)

3. In the **Add new job** window, fill in the following fields:

   ![Add new job](/images/honeypot02.jpg)

   - **Job type**: Use the default parameter **Ground truth**.
   - **Frame selection method**: Use the default parameter **Random**.
   - **Quantity %**: Set the desired percentage of frames for the "ground truth" job. <br>Note, that upon using **Quantity %**, the **Frames** field will be automatically populated.
   - **Frame count**: Set the desired number of frames for the "ground truth" job. <br>Note, that upon using **Frames**, the **Quantity %** field will be automatically populated.

   - **Seed**: (Optional) TBD

4. Click **Submit**.
5. Annotate frames, save your work.
6. Change the status of the job to **Completed**.
7. Change **Stage** to **Accepted**.

The **Ground truth** job will appear in the jobs list.

![Add new job](/images/honeypot03.jpg)

## Managing Ground Truth jobs: Import, Export, and Deletion

Annotations from **Ground truth** jobs are not included in the dataset export,
they also cannot be imported during task annotations import
or with automatic annotation for the task.

Import, export, and delete options are available from
job's menu.

![Add new job](/images/honeypot04.jpg)

### Import

If you want to import the **Ground truth** job, do the following.

1. Open the task, and find the **Ground truth** job in the jobs list.
2. Click on three dots to open the menu.
3. From the menu, select **Import job**.
4. Select import format, and select file.
5. Click **OK**.

### Export

To export the **Ground truth** job, do the following.

1. Open the task, and find a job in the jobs list.
2. Click on three dots to open the menu.
3. From the menu, select **Export job**.

### Delete

To delete the **Ground truth** job, do the following.

1. Open the task, and find the **Ground truth** job in the jobs list.
2. Click on three dots to open the menu.
3. From the menu, select **Delete**.

## Assessing data quality with Ground truth jobs

Once you've established the **Ground truth** job, proceed to annotate the dataset.

CVAT will begin the quality comparison between the annotated task and the **Ground truth** job.

> Note, that the process of quality calculation may take up to several hours, depending on
> the amount of data and labeled objects.

To view results go to the **Task** > **Actions** >  **View analytics**.


![Add new job](/images/honeypot05.jpg)

### Quality data

The Analytics page has the following fields:

<!--lint disable maximum-line-length-->

|Field| Description|
|---|---|
|Mean annotation quality| Displays the average quality of annotations, which includes: the count of accurate annotations, total task annotations, ground truth annotations, accuracy rate, precision rate, and recall rate.|
|GT Conflicts| Conflicts identified during quality assessment, including extra or missing annotations. Mouse over the **?** icon for a detailed conflict report on your dataset.|
|Issues|Number of [opened issues](/docs/manual/advanced/review/). If no issues were reported, will show 0.|
|Quality report| Quality report in JSON format.|
|Ground truth job data|"Information about ground truth job, including date, time, and number of issues.|
|List of jobs|List of all the jobs in the task|

<!--lint enable maximum-line-length-->

### Annotation quality settings

To open **Annotation Quality Settings**, find
**Quality report** and on the right side of it, click on
three dots.

The following window will open:

![Add new job](/images/honeypot08.jpg)

|Field| Description|
|---|---|

Hover over the **?** marks to understand what each field represents.

###  GT conflicts in the CVAT interface

To see GT Conflicts in the CVAT interface, go to **Review** >
**Issues** > **Show ground truth annotations and conflicts**.

![GT conflict](/images/honeypot06.gif)

The ground truth (GT) annotation is depicted as a dotted-line box with an associated label.

Upon hovering over an issue on the right-side panel with your mouse,
the corresponding GT Annotation gets highlighted.

Use arrows in the Issue toolbar to move between GT conflicts.

To create an issue related to the conflict,
right-click on the bounding box and from the
menu select the type of issue you want to create.

![GT conflict](/images/honeypot07.jpg)

##  Annotation quality & Honeypot video tutorial

This video demonstrates the process:

<iframe width="560" height="315" src="https://www.youtube.com/embed/0HtBnr_CZAM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>






