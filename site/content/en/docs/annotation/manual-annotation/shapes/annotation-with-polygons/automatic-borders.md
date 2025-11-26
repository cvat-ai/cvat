---
title: "Drawing using automatic borders"
linkTitle: "Automatic borders"
weight: 2
aliases:
- /docs/manual/advanced/annotation-with-polygons/automatic-borders/
- /docs/annotation/tools/annotation-with-polygons/automatic-borders/
---

![Example of annotation made with polygon and automatic borders option](/images/gif025_mapillary_vistas.gif)

You can use auto borders when drawing a polygon. Using automatic borders allows you to automatically trace
the outline of polygons existing in the annotation.

- To do this, go to settings -> workspace tab and enable `Automatic Bordering`
  or press `Ctrl` while drawing a polygon.

  !["Workspace" tab in "Settings" and highlighted "Automatic bordering" setting](/images/image161.jpg)

- Start drawing / editing a polygon.
- Points of other shapes will be highlighted, which means that the polygon can be attached to them.
- Define the part of the polygon path that you want to repeat.

  ![Annotation with highlighted part for repetition](/images/image157_mapillary_vistas.jpg)

- Click on the first point of the contour part.

  ![Annotation with first contour point highlighted](/images/image158_mapillary_vistas.jpg)

- Then click on any point located on part of the path. The selected point will be highlighted in purple.

  ![Annotation with highlighted middle point](/images/image159_mapillary_vistas.jpg)

- Click on the last point and the outline to this point will be built automatically.

  ![Annotation with last contour point highlighted](/images/image160_mapillary_vistas.jpg)

Besides, you can set a fixed number of points in the `Number of points` field, then
drawing will be stopped automatically. To enable dragging you should right-click
inside the polygon and choose `Switch pinned property`.

Below you can see results with opacity and black stroke:

![Example of annotation with applied opacity and black stroke](/images/image064_mapillary_vistas.jpg)

If you need to annotate small objects, increase `Image Quality` to
`95` in `Create task` dialog for your convenience.
