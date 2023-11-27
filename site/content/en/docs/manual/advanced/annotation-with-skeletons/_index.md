---
title: 'Annotation with skeletons'
linkTitle: 'Annotation with skeletons'
weight: 12
description: 'Guide to creating and editing skeletons'
---


**Skeletons** serve as annotation templates
for annotating complex objects with a consistent structure,
such as human pose estimation or facial landmarks.

A **Skeleton** is composed of numerous points (also referred to as elements),
which may be connected by edges. Each point functions as an individual object,
possessing unique attributes and properties like color, occlusion, and visibility.

However, a **Skeleton** point can only exist within its parent **Skeleton**.

**Skeleton** elements can be marked as `outside` and hidden if needed,
such as when a part is outside the frame.

**Skeletons** can be [**exported**](/docs/manual/advanced/formats/)
in two formats: [**CVAT for image**](/docs/manual/advanced/formats/format-cvat/#cvat-for-videos-export)
and [**COCO Keypoints**](/docs/manual/advanced/formats/coco-keypoints/).
