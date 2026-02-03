---
title: 'Settings'
linkTitle: 'Settings'
weight: 6
aliases:
  - /docs/manual/basics/settings/
---
To open the **Settings**, open the user menu in the header and select **Settings**.
Or you can use the default `F2` shortcut.

The **Settings** section has three tabs:
- [**Player**](#player)
- [**Workspace**](#workspace)
- [**Shortcuts**](#shortcuts)

## Player

In the **Player** tab, you can:

- Control step of `C` and `V` shortcuts.
- Control the speed of `Space`/`Play` button.
- Select canvas background color. You can choose a background color or enter manually (in RGB or HEX format).
- `Reset zoom` Show every image in full size or zoomed out like the previous
  (it is enabled by default for interpolation mode and disabled for annotation mode).
- `Rotate all images` checkbox — switch the rotation of all frames or an individual frame.
- `Smooth image` checkbox — smooth image when zoom-in it.

  |        _smoothed_         |        _pixelized_         |
  | :-----------------------: | :------------------------: |
  | ![Example of an image with "Smooth image" setting applied](/images/smoothed.jpg) | ![Example of an image without "Smooth image" setting applied](/images/pixelized.jpg) |

## Workspace

In the **Workspace** tab, you can:

!["Workspace" tab opened in "Settings"](/images/image155.jpg)

- `Enable auto save` checkbox — turned off by default.
- `Auto save interval (min)` input box — 15 minutes by default.
- `Show all interpolation tracks` checkbox — shows hidden objects on the
  side panel for every interpolated object (turned off by default).
- `Always show object details` - show text for an object on the canvas not only when the object is activated:

  ![Two images displaying the effects of applied and disabled "Always show objects details" setting](/images/image152_detrac.jpg)

- `Content of a text` - setup of the composition of the object details:
  - `ID` - object identifier.
  - `Attributes` - attributes of the object.
  - `Label` - object label.
  - `Source`- source of creating of objects `MANUAL`, `AUTO` or `SEMI-AUTO`.
  - `Descriptions` - description of attributes.
  - `Dimensions` - width, height and rotation for rectangles and ellipses.


- `Position of a text` - text positioning mode selection:
  - `Auto` - the object details will be automatically placed where free space is.
  - `Center` - the object details will be embedded to a corresponding object if possible.

- `Font size of a text` - specifies the text size of the object details.

- `Automatic bordering` - enable automatic bordering for polygons and polylines during drawing/editing.
  For more information To find out more, go to the section
  {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons" "annotation with polygons" >}}.

- `Intelligent polygon cropping` - activates intelligent cropping when editing the polygon (read more in the section
  {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons/edit-polygon" "edit polygon" >}}

- `Show tags on frame` - shows/hides frame tags on the current frame

- `Attribute annotation mode (AAM) zoom margin` input box — defines margins (in px)
  for shape in the attribute annotation mode.

- `Control points size` — defines the size of any interactable points in the tool
(polygon's vertices, rectangle dragging points, etc.)

- `Default number of points in polygon approximation`
  With this setting, you can choose the default number of points in polygon.
  Works for serverless interactors and OpenCV scissors.

- Select **Save** to save settings (settings will be saved on the server and
  will not change after the page is refreshed).
  Select **Cancel** or press `F2` to return to the annotation.

## Shortcuts

In the **Shortcuts** tab, you can set the keyboard combinations.
Learn more in {{< ilink "/docs/getting_started/shortcuts" "Shortcuts" >}}.
