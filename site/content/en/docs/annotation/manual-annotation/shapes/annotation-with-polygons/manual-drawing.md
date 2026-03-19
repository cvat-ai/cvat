---
title: 'Manual drawing'
linkTitle: 'Manual drawing'
weight: 1
aliases:
- /docs/manual/advanced/annotation-with-polygons/manual-drawing/
- /docs/annotation/tools/annotation-with-polygons/manual-drawing/
---

It is used for semantic / instance segmentation.

Before starting, you need to select `Polygon` on the controls sidebar and choose the correct Label.

![Highlighted "Polygon" button and open "Draw new polygon" window](/images/image084.jpg)

- Click `Shape` to enter drawing mode.
  There are two ways to draw a polygon: either create points by clicking or
  by dragging the mouse on the screen while holding `Shift`.

| Clicking points                | Holding Shift+Dragging         |
| ------------------------------ | ------------------------------ |
| ![Example of creating a polygon by clicking points](/images/gif005_detrac.gif) | ![Example of creating a polygon by dragging with mouse](/images/gif006_detrac.gif) |

- When `Shift` isn't pressed, you can zoom in/out (when scrolling the mouse
  wheel) and move (when clicking the mouse wheel and moving the mouse), you can also
  delete the previous point by right-clicking on it.
- You can use the `Selected opacity` slider in the `Objects sidebar` to change the opacity of the polygon.
  You can read more in the
  {{< ilink "/docs/annotation/annotation-editor/objects-sidebar#appearance" "Objects sidebar" >}} section.
- Press `N` again or click the `Done` button on the top panel for completing the shape.
- After creating the polygon, you can move the points or delete them by right-clicking and selecting `Delete point`
  or clicking with pressed `Alt` key in the context menu.
