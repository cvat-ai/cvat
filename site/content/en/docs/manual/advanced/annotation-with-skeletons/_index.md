---
title: 'Annotation with skeletons'
linkTitle: 'Annotation with skeletons'
weight: 12
description: 'Guide to creating and editing skeletons.'
---


Skeletons should be used as annotations `templates` when you need to annotate complex objects sharing the same structure
(e.g. human pose estimation, facial landmarks, etc.).
A skeleton consist of any number of points (also called as elements), joined or not joined by edges.
Any point itself is considered like an individual object with its own attributes and properties
(like color, occluded, outside, etc). At the same time a skeleton point can exist only within the parent skeleton.

Any skeleton elements can be hidden (by marking them `outside`) if necessary (for example if a part is out of a frame).
Currently there are two formats which support exporting skeletons: CVAT & COCO.
