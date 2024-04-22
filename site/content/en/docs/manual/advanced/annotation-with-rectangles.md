---
title: 'Annotation with rectangles'
linkTitle: 'Annotation with rectangles'
weight: 7
---

To learn more about annotation using a rectangle, see the sections:
- [Shape mode (basics)](/docs/manual/basics/shape-mode-basics/)
- [Track mode (basics)](/docs/manual/basics/track-mode-basics/)
- [Shape mode (advanced)](/docs/manual/advanced/shape-mode-advanced/)
- [Track mode (advanced)](/docs/manual/advanced/track-mode-advanced/)

## Rotation rectangle

To rotate the rectangle, pull on the `rotation point`. Rotation is done around the center of the rectangle.
To rotate at a fixed angle (multiple of 15 degrees),
hold `shift`. In the process of rotation, you can see the angle of rotation.

![](/images/image230.jpg)

## Annotation with rectangle by 4 points

It is an efficient method of bounding box annotation, proposed
[here](https://arxiv.org/pdf/1708.02750.pdf).
Before starting, you need to make sure that the drawing method by 4 points is selected.

![](/images/image134.jpg)

Press `Shape` or `Track` for entering drawing mode. Click on four extreme points:
the top, bottom, left- and right-most physical points on the object.
Drawing will be automatically completed right after clicking the fourth point.
Press `Esc` to cancel editing.

![](/images/gif016_mapillary_vistas.gif)
