---
title: 'Vocabulary'
linkTitle: 'Vocabulary'
weight: 19
description: 'List of terms pertaining to annotation in CVAT.'
---
## Label
Label is a type of an annotated object (e.g. person, car, vehicle, etc.)

![](/images/image032_detrac.jpg)

---

## Attribute
Attribute is a property of an annotated object (e.g. color, model,
quality, etc.). There are two types of attributes:

### Unique
Unique immutable and can't be changed from frame to frame (e.g. age, gender, color, etc.)

  ![](/images/image073.jpg)

### Temporary
Temporary mutable and can be changed on any frame (e.g. quality, pose, truncated, etc.)

  ![](/images/image072.jpg)

---

## Track
Track is a set of shapes on different frames which corresponds to one object.
Tracks are created in `Track mode`

![](/images/gif003_detrac.gif)

---

## Annotation
Annotation is a set of shapes and tracks. There are several types of annotations:

- _Manual_ which is created by a person
- _Semi-automatic_ which is created mainly automatically, but the user provides some data (e.g. interpolation)
- _Automatic_ which is created automatically without a person in the loop

---

## Approximation
Approximation allows you to reduce the number of points in the polygon.
Can be used to reduce the annotation file and to facilitate editing polygons.

![](/images/approximation_accuracy.gif)

---

## Trackable
Trackable object will be tracked automatically if the previous frame was
a latest keyframe for the object. More details in the section [trackers](/docs/manual/advanced/ai-tools/#trackers).

![](/images/tracker_indication_detrac.jpg)

---

## Mode

### Interpolation
Mode for video annotation, which uses [`track`](#track) objects.
Only objects on keyframes are manually annotation, and intermediate frames are linearly interpolated.

Related sections:
- [Track mode](/docs/manual/basics/track-mode-basics/)

### Annotation
Mode for images annotation, which uses `shape` objects.

Related sections:
- [Shape mode](/docs/manual/basics/shape-mode-basics/)

---

## Dimension

Depends on the task data type that is defined when the [task is created](/docs/manual/basics/creating_an_annotation_task/).

### 2D

The data format of 2d tasks are images and videos.
Related sections:
- [Creating an annotation task](/docs/manual/basics/creating_an_annotation_task/)

### 3D

The data format of 3d tasks is a cloud of points.
[Data formats for a 3D task](/docs/manual/basics/creating_an_annotation_task/#data-formats-for-a-3d-task)

Related sections:
- [3D task workspace](/docs/manual/basics/3d-task-workspace/)
- [Standard 3D mode](/docs/manual/basics/standard-3d-mode-basics/)
- [3D Object annotation](/docs/manual/basics/3d-object-annotation-basics/)

---

## State
State of the job. The state can be changed by an assigned user in [the menu inside the job](/docs/manual/basics/top-panel/).
There are several possible states: `new`, `in progress`, `rejected`, `completed`.

---

## Stage
Stage of the job. The stage is specified with the drop-down list on the [task page](/docs/manual/basics/tasks-page/).
There are three stages: `annotation`, `validation` or `acceptance`. This value affects the task progress bar.

---

## Subset
A project can have subsets. Subsets are groups for tasks that make it easier to work with the dataset.
It could be `test`, `train`, `validation` or custom subset.

---

## Credentials
Under `credentials` is understood `Key & secret key`, `Account name and token`, `Anonymous access`, `Key file`.
Used to [attach cloud storage](/docs/manual/basics/attach-cloud-storage/#attach-new-cloud-storage).

---

## Resource

Under `resource` is understood `bucket name` or `container name`.
Used to [attach cloud storage](/docs/manual/basics/attach-cloud-storage/#attach-new-cloud-storage).
