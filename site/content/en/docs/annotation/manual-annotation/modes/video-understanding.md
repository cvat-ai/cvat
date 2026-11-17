---
title: 'Video understanding'
linkTitle: 'Video understanding'
weight: 7
description: 'Annotate actions over frame ranges in video jobs.'
---

Open a video job and choose **Video understanding** from the workspace selector.
Each action label has its own timeline track. Clips on different tracks can overlap.
Use **Add action track** to create an interval label with a name and color. The label
is available to other jobs in the same task or project.

## Record an action

1. Go to the first frame and select the action track.
2. Press **M** to start recording. Press **Space** to play or pause, and use **D**
   or **F** to step one frame at a time.
3. At the last frame, press **M** again or double-click the draft clip. Pausing
   holds the draft endpoint so you can confirm it or advance to a later frame.

You can also hold **Shift+M** to play and record until you release the shortcut.
The first ten tracks have number shortcuts **1–9** and **0**, including the
numeric keypad. Press the same number to start and finish a clip by default.
Change this behavior under **Recording settings**, or change the binding using
the shortcut button on the track. **Tab** and **Shift+Tab** cycle through tracks
when the timeline has focus. Press **R** to return to the playback track.

## Adjust and save intervals

Drag either edge of a clip to change its frame range. Hover over the left or
right half and press **+** to extend that edge or **−** to trim it. To enter
exact numbers, select the clip and choose **Edit range**. The first and last
frames displayed on the timeline are both included in the action.

Use **Canvas annotations** to show or hide existing object annotations and
frame tags. You can hide tracks without deleting their clips. To remove a
single clip, select it and choose **Remove clip**. Deleting a track from its menu
deletes the label and all associated intervals throughout the task or project.

Use the normal **Save** button to persist your edits. **Export JSON** downloads
the action labels and inclusive frame ranges for the current job.
