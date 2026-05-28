---
title: "Edit polygon"
linkTitle: "Edit polygon"
weight: 4
aliases:
- /docs/manual/advanced/annotation-with-polygons/edit-polygon/
- /docs/annotation/tools/annotation-with-polygons/edit-polygon/
---

To edit a polygon you have to click on it while holding `Shift`, it will open the polygon editor.

- In the editor you can create new points or delete part of a polygon by closing the line on another point.
- When `Intelligent polygon cropping` option is activated in the settings,
  CVAT considers two criteria to decide which part of a polygon should be cut off during automatic editing.
  - The first criteria is a number of cut points.
  - The second criteria is a length of a cut curve.

  If both criteria recommend to cut the same part, algorithm works automatically,
  and if not, a user has to make the decision.
  If you want to choose manually which part of a polygon should be cut off,
  disable `Intelligent polygon cropping` in the settings.
  In this case after closing the polygon, you can select the part of the polygon you want to leave.

  ![Setting for Intelligent polygon cropping](/images/image209.jpg)
- To scale or rotate a shape as a whole, rather than editing individual points, you can either press `S` or
  click the BBox edit mode button on obeject side bar. After that, a bounding box will appear around the shape,
  in which you can:
  - Scale by dragging any of the bouding box corners or edge handles to resize the shape.
  - Rotate by clicking and draging the rotation handle to rotate the shape around its center.
- You can mathematically mirror a shape across its center axis:
  - You can mirror horizontally by pressing `Shift+H` or selecting ****Mirror horizontally** from the object's
  action menu in the sidebar.
  - Tou can mirror vertically by pressing `Shift+V` or selecting **Mirror vertically** from the object's action
  menu in the sidebar.

- You can press `Esc` to cancel editing.

  ![Example of editing a polygon shape and canceling editing](/images/gif007_mapillary_vistas.gif)
