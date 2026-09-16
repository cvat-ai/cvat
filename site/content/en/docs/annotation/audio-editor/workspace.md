---
title: 'Workspace'
linkTitle: 'Workspace'
weight: 2
description: 'Navigate and inspect an audio recording on the waveform and minimap.'
---

The Audio Editor workspace displays the recording as a waveform. The vertical playhead marks the
current playback position, and colored regions represent audio intervals.

![CVAT Audio Workspace](/images/audio_editor_workspace_01.webp)

## Navigate the waveform

### Move through the recording

- Click the waveform to move the playhead to that time. To move through a zoomed recording, use the
horizontal scrollbar, horizontal scrolling on a supported mouse or touchpad, or
<kbd>Shift</kbd>+mouse wheel.

- The minimap shows the entire recording. Click it to move to a time, or drag its visible-area overlay
to scroll the waveform horizontally.

  ![Minimap](/images/audio_editor_workspace_02.webp)

- Click **Center waveform on playback position** button at the top right corner of the waveform
to bring the current playhead into view.

  ![Center waveform on playback position](/images/audio_editor_workspace_03.webp)

### Zoom and inspect

- Use the [Zoom control](../controls-sidebar/) or scroll the mouse wheel over the waveform to
change the time scale.

- The hover guide shows the timestamp at the pointer position, and timeline tick marks and labels
  adjust automatically to the current zoom level.

  ![Hover guide](/images/audio_editor_workspace_04.webp)

- Drag the handle below the minimap to change the waveform height.

  ![Resize handle](/images/audio_editor_workspace_05.webp)

## Select and edit intervals

| Action | Description |
| --- | --- |
| **Select** | Click an interval on the waveform or select it in the [Objects Sidebar](../objects-sidebar/) to make it active.<br><br>Default shortcuts:<br>Next visible interval: <kbd>Tab</kbd><br>Previous visible interval: <kbd>Shift</kbd>+<kbd>Tab</kbd><br>Each shortcut selects and centers the interval on the waveform. |
| **Move** | Drag an interval to change its position. <br>Hold <kbd>Alt</kbd> while dragging to snap either boundary to a nearby boundary of another visible interval. If both boundaries have eligible snap targets, CVAT uses the closest one. |
| **Resize** | Drag either boundary to change its start or end time. <br>When you resize an interval beyond the visible edge, the waveform scrolls automatically. <br>Hold <kbd>Alt</kbd> to snap the boundary being resized to a nearby boundary of another visible interval. It cannot snap to the other boundary of the same interval. |
| **Bulk resize** | Hold <kbd>Shift</kbd> near adjacent interval boundaries to highlight nearby unlocked boundaries, then drag to resize them together. |

### Interval details

When you select an interval, its details panel appears below the waveform.

| Image | Description |
| --- | --- |
| ![Interval Header Left ](/images/audio_editor_workspace_06.webp) ![Interval Header Left ](/images/audio_editor_workspace_07.webp) | The header shows the interval number, label, source when available, start and end time, and duration. Use the label selector to change its label. |
| ![Interval Header Playback ](/images/audio_editor_workspace_08.webp) | Playback controls move the playhead to the interval start or end, or play the interval once.<br><br>Default shortcuts:<br>Set playback to start: <kbd>Shift</kbd>+<kbd>D</kbd><br>Play once: <kbd>Shift</kbd>+<kbd>Space</kbd><br>Set playback to end: <kbd>Shift</kbd>+<kbd>F</kbd> |
| ![Interval Header State ](/images/audio_editor_workspace_09.webp) | State controls lock, pin, or hide the interval. Locked intervals cannot be edited, moved, or resized. Pinned intervals cannot be moved. Hidden intervals are not shown on the waveform.<br><br>Default shortcuts:<br>Lock/Unlock: <kbd>L</kbd><br>Pin/Unpin: <kbd>P</kbd><br>Hide/Show: <kbd>H</kbd> |
| ![Interval Header More Actions ](/images/audio_editor_workspace_10.webp) | The **More actions** menu lets you fit the waveform to the interval, copy its URL, duplicate it, change its color when available, or delete it.<br><br>Default shortcuts:<br>Fit interval: <kbd>I</kbd><br>Delete: <kbd>Del</kbd><br>Force-delete a locked interval: <kbd>Shift</kbd>+<kbd>Del</kbd> |
| ![Interval Header Attribute ](/images/audio_editor_workspace_11.webp) | All attributes are expanded by default. Edit their values or collapse them as needed. Available attributes depend on the selected label. |

### Play and manage intervals

- Double-click an interval on the waveform to play it once.
- Right-click it to open the context menu, where you can:
  - Fit the waveform to the interval.
  - Copy the interval URL.
  - Duplicate the interval.
  - Change its color, when available.
  - Delete the interval.

  ![Interval Context Menu ](/images/audio_editor_workspace_12.webp)

For interval creation, see [Create intervals](../controls-sidebar/#create-intervals).
