---
title: 'Vocabulary'
linkTitle: 'Vocabulary'
weight: 19
description: 'List of terms pertaining to annotation in CVAT.'
---
## Label
Is a type of an annotated object (e.g. person, car, vehicle, etc.)

![](/images/image032_detrac.jpg)

---

## Attribute
Is a property of an annotated object (e.g. color, model,
quality, etc.). There are two types of attributes:

### Unique
Immutable and can't be changed from frame to frame (e.g. age, gender, color, etc.)

  ![](/images/image073.jpg)

### Temporary
Mutable and can be changed on any frame (e.g. quality, pose, truncated, etc.)

  ![](/images/image072.jpg)

---

## Track
Is a set of shapes on different frames which corresponds to one object.
Tracks are created in `Track mode`

![](/images/gif003_detrac.gif)

---

## Annotation
Is a set of shapes and tracks. There are several types of annotations:

- _Manual_ which is created by a person
- _Semi-automatic_ which is created mainly automatically, but the user provides some data (e.g. interpolation)
- _Automatic_ which is created automatically without a person in the loop

---

## Approximation
Allows you to reduce the number of points in the polygon.
Can be used to reduce the annotation file and to facilitate editing polygons.

![](/images/approximation_accuracy.gif)

---

## Trackable
Object will be tracked automatically if the previous frame was
a latest keyframe for the object. More details in the section [trackers](/docs/manual/advanced/ai-tools/#trackers).

![](/images/tracker_indication_detrac.jpg)

---

## State
Of the job. The state can be changed by an assigned user in [the menu inside the job](/docs/manual/basics/top-panel/).
There are several possible states: `new`, `in progress`, `rejected`, `completed`.

---

## Stage
Of the job. The stage is specified with the drop-down list on the [task page](/docs/manual/basics/tasks-page/).
There are three stages: `annotation`, `validation` or `acceptance`. This value affects the task progress bar.

---


