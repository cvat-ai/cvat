---
title: 'Quality control'
linkTitle: 'Quality control'
weight: 21
description: 'Overview of quality control features'
---

<!-- TODO: some intro about importance of quality control -->

CVAT has the following features to manage quality of annotations:
- Validation configuration for a task
- Job validation on job finish (aka "Immediate feedback")
- Review mode for annotations
- Quality reporting and analytics

## How to enable quality control for a new task

1. Go to task creation
1. Select the source media, configure other parameters
1. Scroll down to the "Quality Control" section
1. Select one of the validation modes available
1. Create the task
1. Upload or create Ground Truth annotations in the GT job in the task
1. Switch the GT job into the `acceptance`-`completed` state

## How to enable quality control for an already existing task

> For already existing tasks only the Ground Truth validation mode is available. If you want
> to use Honeypots for your task, you will need to recreate the task.

1. Open the task page
1. Click on the "+" button next to the job list
1. Upload or create Ground Truth annotations in the GT job in the task
1. Switch the GT job into the `acceptance`-`completed` state

