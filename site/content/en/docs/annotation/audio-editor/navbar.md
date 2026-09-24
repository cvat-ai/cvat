---
title: 'Menu and Navigation Bar'
linkTitle: 'Menu and Navbar'
weight: 1
description: 'Use the Audio Editor menu and top bar to manage audio annotations and playback.'
---

The Audio Editor top bar contains job actions, save and undo controls, and audio playback navigation.

![CVAT Audio Menu and Navigation Bar](/images/audio_editor_navbar_01.webp)

## Menu

Open the **Menu** to manage the current job:

| Item | Description |
| --- | --- |
| **Upload annotations** | Imports interval annotations into the job. Audio tasks use the {{< ilink "/docs/dataset_management/formats/format-generic-tsv" "Generic TSV 1.0" >}} format. |
| **Export job dataset** | Exports interval annotations. |
| **Remove annotations** | Removes all intervals, or only the intervals in a selected time range.<br>The removal is saved only after you save the job.<br> ![Remove audio annotations](/images/audio_editor_navbar_02.webp) |
| **Run actions** | Annotation actions are currently not available for audio jobs. |
| **Open the task** | Opens the task details page. |
| **Change job state** | Changes the job state to **New**, **In Progress**, **Rejected**, or **Completed**. |
| **Finish the job** | Saves the annotations and sets the job state to **Completed**. |

## Save, undo, and redo

| Button | Description |
| --- | --- |
| **Save**<br><br>![Save](/images/audio_editor_navbar_03.webp) | Submits unsaved interval changes to the server.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>S</kbd><br><kbd>⌘</kbd>+<kbd>S</kbd> |
| **Undo**<br><br>![Undo](/images/audio_editor_navbar_04.webp) | Reverses the latest interval creation, deletion, or edit in the current session.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>Z</kbd><br><kbd>⌘</kbd>+<kbd>Z</kbd> |
| **Redo**<br><br>![Redo](/images/audio_editor_navbar_05.webp) | Restores the most recently undone interval change.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><br><kbd>Ctrl</kbd>+<kbd>Y</kbd><br><kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> |

## Playback navigation

Use the player controls to play or pause the audio and move the playhead:

![Playback navigation](/images/audio_editor_navbar_19.gif)

| Button | Description |
| --- | --- |
| **Jump to start**<br>![Jump to start](/images/audio_editor_navbar_06.webp) | Moves the playhead to the beginning of the recording. |
| **Long step backward**<br>![Long step backward](/images/audio_editor_navbar_07.webp) | Moves the playhead backward by 5% of the currently visible waveform.<br><br>Default shortcut: <kbd>C</kbd>. |
| **Short step backward**<br>![Short step backward](/images/audio_editor_navbar_08.webp) | Moves the playhead backward by 0.5% of the currently visible waveform.<br><br>Default shortcut: <kbd>D</kbd>. |
| **Play/Pause**<br>![Play/Pause](/images/audio_editor_navbar_09.webp) | Starts or pauses playback.<br><br>Default shortcut: <kbd>Space</kbd>. |
| **Short step forward**<br>![Short step forward](/images/audio_editor_navbar_10.webp) | Moves the playhead forward by 0.5% of the currently visible waveform.<br><br>Default shortcut: <kbd>F</kbd>. |
| **Long step forward**<br>![Long step forward](/images/audio_editor_navbar_11.webp) | Moves the playhead forward by 5% of the currently visible waveform.<br><br>Default shortcut: <kbd>V</kbd>. |
| **Jump to end**<br>![Jump to end](/images/audio_editor_navbar_12.webp) | Moves the playhead to the end of the recording. |

{{< alert title="Note" >}}
The step sizes are fixed and cannot be configured. The displayed shortcuts are configurable.
{{< /alert >}}

## Job information and Annotation Mode

| Control | Description |
| --- | --- |
| **Fullscreen**<br>![Fullscreen](/images/audio_editor_navbar_13.webp) | Toggles fullscreen mode for the Audio Editor. |
| **Guide**<br>![Guide](/images/audio_editor_navbar_14.webp) | Opens the task guide when one is configured. |
| **Info**<br>![Info](/images/audio_editor_navbar_15.webp) | Opens job statistics, including the total audio duration, region count, and per-label region counts, duration, and coverage.<br>![Info dialog](/images/audio_editor_navbar_18.webp) |
| **Filters**<br>![Filters](/images/audio_editor_navbar_16.webp) | Restricts the intervals shown in the sidebar and waveform. See {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "Filters" >}}. |
| **Annotation mode**<br>![Annotation mode](/images/audio_editor_navbar_17.webp) | The drop-down list to switch between different annotation modes: <br> **Audio annotation** is currently the only available annotation mode for audio jobs. |
