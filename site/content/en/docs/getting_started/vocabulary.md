---
title: 'Vocabulary'
linkTitle: 'Vocabulary'
weight: 2
description: 'List of terms pertaining to annotation in CVAT.'
aliases:
  - /docs/manual/basics/vocabulary/


---
## Label
Label is a type of an annotated object (e.g. person, car, vehicle, etc.)

![Example of a label in interface](/images/image032_detrac.jpg)

---

## Attribute
Attribute is a property of an annotated object (e.g. color, model,
quality, etc.). There are two types of attributes:

### Unique
Unique immutable and can't be changed from frame to frame (e.g. age, gender, color, etc.)

  ![Example of a unique attribute](/images/image073.jpg)

### Temporary
Temporary mutable and can be changed on any frame (e.g. quality, pose, truncated, etc.)

  ![Example of a temporary attribute](/images/image072.jpg)

---

## Track
Track is a set of shapes on different frames which corresponds to one object.
Tracks are created in `Track mode`

![Example of a track in interface](/images/gif003_detrac.gif)

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

![Example of an applied approximation](/images/approximation_accuracy.gif)

---

## Trackable
Trackable object will be tracked automatically if the previous frame was
a latest keyframe for the object. More details in the section
{{< ilink "/docs/annotation/auto-annotation/ai-tools#trackers" "trackers" >}}.

![Example of a trackable object in interface](/images/tracker_indication_detrac.png)

---

## Mode

### Interpolation
Mode for video annotation, which uses [`track`](#track) objects.
Only objects on keyframes are manually annotation, and intermediate frames are linearly interpolated.

Related sections:
- {{< ilink "/docs/annotation/manual-annotation/shapes/track-mode-basics" "Track mode" >}}

### Annotation
Mode for images annotation, which uses `shape` objects.

Related sections:
- {{< ilink "/docs/annotation/manual-annotation/shapes/shape-mode-basics" "Shape mode" >}}

---

## Dimension

Depends on the task data type that is defined when the
{{< ilink "/docs/workspace/tasks-page#create-annotation-task" "task is created" >}}.

### 2D

The data format of 2d tasks are images and videos.
Related sections:
- {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "Creating an annotation task" >}}

### 3D

The data format of 3d tasks is a cloud of points.
{{< ilink "/docs/workspace/tasks-page#data-formats-for-a-3d-task" "Data formats for a 3D task" >}}

Related sections:
- {{< ilink "/docs/annotation/annotation-editor/3d-task-workspace" "3D task workspace" >}}
- {{< ilink "/docs/annotation/manual-annotation/modes/3d-object-annotation" "3D Object annotation" >}}

---

## State
State of the job. The state can be changed by an assigned user in
{{< ilink "/docs/annotation/annotation-editor/navbar.md#top-panel" "the menu inside the job" >}}.
There are several possible states: `new`, `in progress`, `rejected`, `completed`.

---

## Stage
Stage of the job. The stage is specified with the drop-down list on the
{{< ilink "/docs/workspace/tasks-page" "task page" >}}.
There are three stages: `annotation`, `validation` or `acceptance`. This value affects the task progress bar.

---

## Subset
A project can have subsets. Subsets are groups for tasks that make it easier to work with the dataset.
It could be `test`, `train`, `validation` or custom subset.

---

## Credentials
Under `credentials` is understood `Key & secret key`, `Account name and token`, `Anonymous access`, `Key file`.
Used to {{< ilink "/docs/workspace/attach-cloud-storage#attach-new-cloud-storage" "attach cloud storage" >}}.

---

## Resource

Under `resource` is understood `bucket name` or `container name`.
Used to {{< ilink "/docs/workspace/attach-cloud-storage#attach-new-cloud-storage" "attach cloud storage" >}}.
