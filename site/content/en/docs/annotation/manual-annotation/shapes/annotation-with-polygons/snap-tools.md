---
title: "Snap tools"
linkTitle: "Snap tools"
weight: 2
aliases:
- /docs/manual/advanced/annotation-with-polygons/snap-tools/
- /docs/annotation/tools/annotation-with-polygons/snap-tools/
---

# Snap to contour

![Example of annotation made with polygon and snap to contour option](/images/gif025_mapillary_vistas.gif)

Snap to contour allows you to automatically trace the outline of existing shapes when drawing or editing a polygon.
This feature helps you quickly create precise annotations by snapping to the edges of nearby objects.

You can enable snap to contour in several ways:

- **Using the Snap Tools control** : Click the Snap Tools button in the annotation sidebar,
  then toggle the "Snap to contour" button.

![Snap to contour button](/images/snap_to_contour_button.png)

- **Keyboard shortcut**: Go to shortcut settings and set up a shortcut for a  “Snap to contour" feature


## Using snap to contour

Once enabled:

1. Start drawing or editing a polygon.
2. Points of other shapes will be highlighted, indicating that the polygon can attach to them.
3. Define the part of the contour you want to trace.

   ![Annotation with highlighted part for repetition](/images/image157_mapillary_vistas.jpg)

4. Click on the first point of the contour segment.

   ![Annotation with first contour point highlighted](/images/image158_mapillary_vistas.jpg)

5. Then click on any point along the path you want to trace. The selected point will be highlighted in purple.

   ![Annotation with highlighted middle point](/images/image159_mapillary_vistas.jpg)

6. Click on the last point and the contour will be traced automatically between your points.

   ![Annotation with last contour point highlighted](/images/image160_mapillary_vistas.jpg)

Below you can see results with opacity and black stroke applied:

![Example of annotation with applied opacity and black stroke](/images/image064_mapillary_vistas.jpg)

# Snap to point

Snap to point allows you to automatically align polygon points with the corners and vertices of existing shapes.
This feature helps you create precise annotations by snapping points to existing shape boundaries,
ensuring perfect alignment between adjacent objects.

## Enabling snap to point

You can enable snap to point in several ways:

- **Using the Snap Tools control**: Click the Snap Tools button in the annotation sidebar,
  then toggle the "Snap to point" button.

![Snap to point button](/images/snap_to_point_button.png)

- **Keyboard shortcut**: Go to shortcut settings and set up a shortcut for the "Snap to point" feature.

## Using snap to point

Once enabled:

1. Start drawing or editing a polygon, polyline, or points shape.
2. As you move your cursor near existing shape vertices, a snap indicator will appear.
3. When a snap target is detected (within the snap radius), your point will automatically align to the target vertex.
4. Click to place the point at the snapped location.

![Snap to point feature example](/images/snap_to_point.gif)

## Additional options

- **Disable temporarily**: Hold `Ctrl` while drawing to temporarily disable snap to point if you need to
  place a point near, but not exactly on, an existing vertex.

- **Use both features**: Both snap tools can be enabled simultaneously for maximum precision.
  Use snap to contour for tracing edges and snap to point for aligning vertices.

