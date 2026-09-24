---
title: 'Annotation with rectangles'
linkTitle: 'Rectangles'
weight: 1
aliases:
- /docs/manual/advanced/annotation-with-rectangles/
- /docs/annotation/tools/annotation-with-rectangles/
---

To learn more about annotation using a rectangle, see the sections:
- {{< ilink "/docs/annotation/manual-annotation/shapes/shape-mode-basics" "Shape mode (basics)" >}}
- {{< ilink "/docs/annotation/manual-annotation/shapes/track-mode-basics" "Track mode (basics)" >}}

## Annotation with rectangle by 4 points

It is an efficient method of bounding box annotation, proposed
[here](https://arxiv.org/pdf/1708.02750.pdf).
Before starting, you need to make sure that the drawing method by 4 points is selected.

![Open "Draw new rectangle" window with highlighted "By 4 points" option](/images/image134.webp)

Press `Shape` or `Track` for entering drawing mode. Click on four extreme points:
the top, bottom, left- and right-most physical points on the object.
Drawing will be automatically completed right after clicking the fourth point.
Press `Esc` to cancel editing.

![Example of annotation process made with four point rectangle](/images/gif016_mapillary_vistas.gif)

## Rotated bounding boxes {#drawing-rotated-bounding-boxes}

You can draw a rotated box from contour points, rotate an existing rectangle, or change which side carries
its white rotation marker.

### Create a rotated box

Use the **Rotated** drawing method to create a bounding box around an object that is tilted in the image.
Click points along the object's outline, and CVAT calculates the smallest-area rectangle that encloses them,
including its rotation angle. This method is available in both **Shape** and **Track** modes.

![Open "Draw new rectangle" window with highlighted "Rotated" option](/images/rectangle-control-rotated.webp)

1. Open **Draw new rectangle** from the controls sidebar.
2. Choose a **Label** and select **Rotated** under **Drawing method**.
3. Click **Shape** or **Track** to start drawing.
4. Click at least **three points** along the object's outline. Spread the points around the object to capture
   its full extent. The points must not all lie on a single straight line.
5. Check the box preview as you add points. Add more points where needed to capture the object's outline.
6. Press `N` or click **Done** on the top panel to finish.

Unlike the **4 Points** method, **Rotated** does not finish automatically after the fourth point.
You can keep adding points before completing the box.

![Drawing a rotated box](/images/rotated-box-draw.gif)

| Action | Control |
| --- | --- |
| Add a contour point | Left-click |
| Remove the last contour point | Right-click |
| Finish the box | `N` or **Done** |
| Cancel drawing | `Esc` |

The shortcuts above use the default key bindings.

### Orientation marker

The white marker shows where the box's rotation handle will be. It starts on the side closest to your
**first point**. As you add points, the preview changes, so the marker may move to another side.
It is not fixed to the first edge you draw.

To find the closest side, CVAT measures the perpendicular distance from your first point to the straight line
that each side lies on. The marker is placed just outside the middle of the selected side. As the preview changes.

To help place the marker on the side you want, start near the middle of that side rather than at a corner.
After drawing, you can move the marker to another side using **Orientation** in the object's actions menu.

### Rotate an existing box {#rotation-rectangle}

Drag the white rotation handle to rotate a completed rectangle around its center.
The rotation angle is displayed while you drag. Hold `Shift` to snap to multiples of 15 degrees.
This works for rectangles created with any drawing method.

![Annotation with rectangle shape and highlighted rotation point](/images/image230.jpg)

### Change the box orientation

Use **Orientation** menu to move the white rotation marker to another side while keeping the box's outline
and covered image area unchanged. This is useful when the fitted box already matches the object,
but the marker is on a different side than intended.

![Change orientation](/images/change-orientation.webp)

1. Open three-dot actions menu of the object and select **Orientation**.
2. Choose **90°** with the clockwise arrow, **90°** with the counterclockwise arrow, or **180°**.
