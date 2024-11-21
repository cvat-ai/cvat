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

## Task validation modes

Currently, there are 2 validation modes available: Ground Truth and Honeypots.
Both modes rely on the use of Ground Truth (GT) annotations in a task. These annotations
a considered "true". In practice it means they are supposed to be carefully annotated and verified.
These annotations are stored in a separate job, called "GT job", where they can be managed.
There can only be only 1 GT job in a task.

### Ground Truth

In this mode some random frames of the task are selected into the validation set.
The regular annotation jobs in the task are not affected in any way.
This validation mode can use several frame selection methods. GT jobs can be created and
removed during the task creation or at any moment of the task lifetime. This validation mode
is available for any tasks and annotations.

### Honeypots

In this mode some random frames of the task are selected into the validation set.
Then, validation frames are randomly mixed into regular annotation jobs. It can also be
called "GT pool", reflecting the way validation frames are used.
This mode can only be used at task creation and cannot be changed later.

The mode has some limitations on the compatible tasks. It's not possible to use it
for an already existing task, the task has to be recreated. This mode implies random frame ordering,
so it is only available for image annotation tasks and not for ordered sequences like videos.
Tracks are not supported in such tasks.

It's possible to manage the validation set after the task is created - annotations can be edited,
frames can be excluded and restored, and honeypot frames in the regular jobs can be changed.
However, it's not possible to select different validation frames.

Here is a brief comparison of the validation modes:

| **Aspect**         | **Ground Truth**                                 | **Honeypots**                         |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| When can be used        | any time                          | at task creation only |
| Frame management options       | add, remove, exclude, restore     | exclude, restore, change honeypots in jobs |
| Task frame requirements        | -                          | random ordering only |
| Annotations    | any                                 | tracks are not supported |
| Minimum validation frames count    | - `manual`, `random_uniform` - any</br>&nbsp;(but some jobs can get no validation frames)</br>- `random_per_job` - jobs count * GT frames per job        | not less than honeypots count per job |
| Task annotation import | GT annotations and regular annotations do not affect each other | Annotations are imported both into the GT job and regular jobs. Annotations for validation frames are copied into corresponding honeypot frames. |
| Task annotation export | GT annotations and regular annotations do not affect each other | Annotations for non-validation frames are exported as is. Annotations for validation frames are taken from the GT frames. Honeypot frames are skipped. |

Here are some examples on how to choose between these options. A general advice is to use
Ground Truth for better flexibility, but keep in mind that it can require more resources for
validation set annotation. Honeypots, on the other side, can be beneficial if you want to
minimize the number of validation images required, but the downside here is that there are some
limitations on where this mode can be used.

Example: a video annotation with tracks. In this case there is only 1 option -
the Ground Truth mode, so just use it.

Example: an image dataset annotation, image order is not important. Here you can use both options.
You can choose Ground Truth for better flexibility in validation. This way, you will have the
full control of validation frames in the task, annotations options won't be limited, and the
regular jobs will not be affected in any way. However, if you have a limited budget
for the validation (for instance, you have only a small number of validation frames) or you want
to allow more scalability (with this approach the number of validation frames doesn't depend on
the number of regular annotation jobs), it makes sense to consider using Honeypots instead.

## Quality management options

If a task has a validation configured, there are several options to manage validation set images.
With any of the validation modes, there will be a special Ground Truth (GT) job in the task.

### Frame set management

Validation frames can be managed on the task Quality Management page. Here it's possible to
check the number of validation frames, current validation mode and review the frame status.

In both validation modes it's possible to exclude some of the validation frames
from being used for validation. This can be useful if you find that some
of the validation frames are "bad", extra, or it they have incorrect annotations,
which you don't want to fix. Once a frame is marked "excluded", it will not be used
for validation. There is also an option to restore a previously excluded frame if you decide so.

In the Ground Truth validation mode, there will be an option to remove the GT job from the task.
It can be useful if you want to change validation set frames completely, add more frames,
or remove some of the frames for any reason. This is available in the GT job Actions menu.

In the Honeypots mode, it's not possible to add or remove the GT job, so it's not possible to
add more validation frames.

### Annotation management
