---
title: 'Vocabulary'
linkTitle: 'Vocabulary'
weight: 19
description: 'List of terms pertaining to annotation in CVAT.'
---
**Label** is a type of an annotated object (e.g. person, car, vehicle, etc.)

![](/images/image032_detrac.jpg)

---

**Attribute** is a property of an annotated object (e.g. color, model,
quality, etc.). There are two types of attributes:

- **Unique**: immutable and can't be changed from frame to frame (e.g. age, gender, color, etc.)

  ![](/images/image073.jpg)

- **Temporary**: mutable and can be changed on any frame (e.g. quality, pose, truncated, etc.)

  ![](/images/image072.jpg)

---

**Track** is a set of shapes on different frames which corresponds to one object.
Tracks are created in `Track mode`

![](/images/gif003_detrac.gif)

---

**Annotation** is a set of shapes and tracks. There are several types of annotations:

- _Manual_ which is created by a person
- _Semi-automatic_ which is created mainly automatically, but the user provides some data (e.g. interpolation)
- _Automatic_ which is created automatically without a person in the loop

---

**Approximation** allows you to reduce the number of points in the polygon.
Can be used to reduce the annotation file and to facilitate editing polygons.

![](/images/approximation_accuracy.gif)

---

**Trackable** object will be tracked automatically if the previous frame was
a latest keyframe for the object. More details in the section [trackers](/docs/manual/advanced/ai-tools/#trackers).

![](/images/tracker_indication.jpg)
