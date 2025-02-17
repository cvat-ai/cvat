---
title: 'Frame deleting'
linkTitle: 'Delete frame from task'
weight: 18
description: 'This section explains how to delete and restore a frame from a task.'
---

# Delete frame

You can delete the current frame from a task.
This frame will not be presented either in the UI or in the exported annotation.
Thus, it is possible to mark corrupted frames that are not subject to annotation.

1. Go to the Job annotation view and click on the **Delete frame** button (**Alt**+**Del**).

   > **Note:** When you delete with the shortcut,
   > the frame will be deleted immediately without additional confirmation.

   ![](/images/image245.jpg)

1. After that you will be asked to confirm frame deleting.
   > **Note:** all annotations from that frame will be deleted, unsaved annotations
   > will be saved and the frame will be invisible in the annotation view (Until you make it visible in the settings).
   > If there is some overlap in the task and the deleted frame falls within this interval,
   > then this will cause this frame to become unavailable in another job as well.
1. When you delete a frame in a job with tracks, you may need to adjust some tracks manually. Common adjustments are:
   - Add keyframes at the edges of the deleted interval for the interpolation to look correct;
   - Move the keyframe start or end keyframe to the correct side of the deleted interval.

# Configure deleted frames visibility and navigation

If you need to enable showing the deleted frames, you can do it in the settings.

1. Go to the settings and chose **Player** settings.

   ![](/images/image246.jpg)

1. Click on the **Show deleted frames** checkbox. And close the settings dialog.

   ![](/images/image247.jpg)

1. Then you will be able to navigate through deleted frames.
   But annotation tools will be unavailable. Deleted frames differ in the corresponding overlay.

1. There are view ways to navigate through deleted frames without enabling this option:

   - Go to the frame via direct navigation methods: navigation slider or frame input field,
   - Go to the frame via the direct link.

1. Navigation with step will not count deleted frames.

# Restore deleted frame

You can also restore deleted frames in the task.

1. Turn on deleted frames visibility, as it was told in the previous part,
   and go to the deleted frame you want to restore.

   ![](/images/image248.jpg)

2. Click on the **Restore** icon. The frame will be restored immediately.
