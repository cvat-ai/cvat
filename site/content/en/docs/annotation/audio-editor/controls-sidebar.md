---
title: 'Controls Sidebar'
linkTitle: 'Controls Sidebar'
weight: 4
description: 'Choose interval tools and adjust audio playback.'
---

Use the controls sidebar to create and split intervals, and control playback settings.

| Control | Description |
| --- | --- |
| **Cursor** <br>![Cursor ](/images/audio_editor_controls_01.webp) | Returns to the selection mode and cancels an active interval creation or recording mode.<br><br>Default shortcut: <kbd>Esc</kbd>. |
| **Audio interval tools** <br>![Audio interval tools ](/images/audio_editor_controls_02.webp) <br>![Audio interval tools 2 ](/images/audio_editor_controls_03.webp) | Opens **Draw**, **Record**, and **Extend** tools and default label selection. See [Create intervals](#create-intervals). |
| **Split interval at playback position** <br>![Split selector ](/images/audio_editor_controls_04.webp) | To split an interval, place the playhead strictly inside it and click the button. <br>CVAT splits the target interval into two intervals with the same label, attributes, and color. <br>A locked or hidden interval cannot be split. <br>If multiple intervals are eligible and one is active, CVAT splits the active interval. <br>If multiple intervals are eligible and none is active, CVAT lets you choose which interval to split.<br><br>Default shortcut: <kbd>Alt</kbd>+<kbd>M</kbd>. |
| **Loop interval playback** <br>![Loop ](/images/audio_editor_controls_05.webp) | Toggles looping playback for the active interval.<br><br>Default shortcut: <kbd>R</kbd>. |
| **Zoom** <br>![Zoom ](/images/audio_editor_controls_06.webp) | Changes the waveform time scale: x1-x300. <br>Minimum base display rate is 8px/second. |
| **Volume** <br>![Volume ](/images/audio_editor_controls_07.webp) | Changes the playback volume: 0-100%. |
| **Speed** <br>![Speed ](/images/audio_editor_controls_08.webp) | Changes the playback speed: 0.1x-4x. |


To change default shortcuts, see [Shortcuts](../../../getting_started/shortcuts/).

## Create intervals

Open the **Audio interval** control and choose a label. You can then use one of the following
methods:

| Method | How it works |
| --- | --- |
| **Draw** | Drag over the waveform to define an interval. You can drag in either direction. <br>Hold <kbd>Alt</kbd> when setting the start or end to snap that boundary to a nearby boundary of a visible interval. <br><br>Default shortcut: <kbd>N</kbd>. |
| **Record** | Start recording at the current playhead position.<br>Press play to start recording.<br>Press pause to set the end time.<br>Press <kbd>Esc</kbd> to cancel an unfinished recording.<br><br>Default shortcut: <kbd>Shift</kbd>+<kbd>N</kbd>. |
| **Extend** | Creates a new interval from the end of the nearest preceding interval to the current playhead. <br>If there is no preceding interval, it starts at the beginning of the recording.<br><br>Default shortcut: <kbd>Shift</kbd>+<kbd>E</kbd>. |
