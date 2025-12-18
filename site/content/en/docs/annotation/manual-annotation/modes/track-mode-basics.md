---
title: 'Track mode'
linkTitle: 'Track mode'
weight: 3
description: 'Usage examples and basic operations available during annotation in track mode.'
aliases:
- /docs/annotation/manual-annotation/shapes/track-mode-basics.md
- /docs/manual/basics/track-mode-basics/
- /docs/manual/advanced/track-mode-advanced/
- /docs/annotation/tools/track-mode-basics/
- /docs/annotation/tools/track-mode-advanced/
---

Usage examples:

- Create new annotations for a sequence of frames.
- Add/modify/delete objects for existing annotations.
- Edit tracks, merge several rectangles into one track.

1. Like in the `Shape mode`, you need to select a `Rectangle` on the sidebar,
   in the appearing form, select the desired `Label` and the `Drawing method`.

   !["Draw new rectangle" window with highlighted "Label" and "Drawing method" options](/images/image083.jpg)

1. Creating a track for an object (look at the selected car as an example):

   - Create a `Rectangle` in `Track mode` by selecting `Track`.

     !["Draw new rectangle" window with highlighted "Track" option](/images/image014.jpg)

   - In `Track mode`, the rectangle will be automatically interpolated on the next frames.
   - The cyclist starts moving on frame #2270. Let's mark the frame as a key frame.
     You can press `K` for that or select the `star` button (see the screenshot below).

     ![Objects sidebar with highlighted button for making a keyframe](/images/image016.jpg)

   - If the object starts to change its position, you need to modify the rectangle where it happens.
     It isn't necessary to change the rectangle on each frame, simply update several keyframes
     and the frames between them will be interpolated automatically.
   - Let's jump 30 frames forward and adjust the boundaries of the object. See an example below:

     ![Several frames displaying a keyframe annotation](/images/image017_detrac.jpg)

   - After that the rectangle of the object will be changed automatically on frames 2270 to 2300:

     ![Example of automatically tracked object](/images/gif019_detrac.gif)

1. When the annotated object disappears or becomes too small, you need to
   finish the track. You have to choose `Outside Property`, shortcut `O`.

   ![Objects sidebar with highlighted "Outside property" button](/images/image019.jpg)

1. If the object isn't visible on a couple of frames and then appears again,
   you can use the `Merge` feature to merge several individual tracks
   into one.

   ![User interface with highlighted "Merge" button](/images/image020.jpg)

   - Create tracks for moments when the cyclist is visible:

     ![Example of a created track for an object that is sometimes not visible](/images/gif001_detrac.gif)

   - Select `Merge` button or press key `M` and select on any rectangle of the first track
     and on any rectangle of the second track and so on:

     ![Several frames displaying the process of track merging](/images/image162_detrac.jpg)

   - Select `Merge` button or press `M` to apply changes.

     ![User interface with highlighted "Merge" button](/images/image020.jpg)

   - The final annotated sequence of frames in `Interpolation` mode can
     look like the clip below:

     ![Example of a track with interpolated frames](/images/gif003_detrac.gif)

Shapes that were created in the track mode, have extra navigation buttons.

- These buttons help to jump to the previous/next keyframe.

  ![Highlighted "Previous" and "Next" buttons in user interface](/images/image056.jpg)

- The button helps to jump to the initial frame and to the last keyframe.

  ![Highlighted "Initial frame" and "Last frame" buttons in user interface](/images/image057.jpg)

You can use the `Split` function to split one track into two tracks:

![Example of an annotation with split tracks](/images/gif010_detrac.gif)
========
