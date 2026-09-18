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
| **Remove annotations** | Removes all intervals, or only the intervals in a selected time range. The removal is saved only after you save the job. |
| **Run actions** | Annotation actions are currently not available for audio jobs. |
| **Open the task** | Opens the task details page. |
| **Change job state** | Changes the job state to **New**, **In Progress**, **Rejected**, or **Completed**. |
| **Finish the job** | Saves the annotations and sets the job state to **Completed**. |

## Save, undo, and redo

| Button | Description |
| --- | --- |
| **Save** | Submits unsaved interval changes to the server.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>S</kbd><br><kbd>⌘</kbd>+<kbd>S</kbd> |
| **Undo** | Reverses the latest interval creation, deletion, or edit in the current session.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>Z</kbd><br><kbd>⌘</kbd>+<kbd>Z</kbd> |
| **Redo** | Restores the most recently undone interval change.<br><br>Default shortcuts:<br><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><br><kbd>Ctrl</kbd>+<kbd>Y</kbd><br><kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> |

## Playback navigation

Use the player controls to play or pause the audio and move the playhead:

| Button | Description |
| --- | --- |
| **Jump to start** | Moves the playhead to the beginning of the recording. |
| **Long step backward** | Moves the playhead backward by a long step.<br><br>Default shortcut: <kbd>C</kbd>. |
| **Short step backward** | Moves the playhead backward by a short step.<br><br>Default shortcut: <kbd>D</kbd>. |
| **Play/Pause** | Starts or pauses playback.<br><br>Default shortcut: <kbd>Space</kbd>. |
| **Short step forward** | Moves the playhead forward by a short step.<br><br>Default shortcut: <kbd>F</kbd>. |
| **Long step forward** | Moves the playhead forward by a long step.<br><br>Default shortcut: <kbd>V</kbd>. |
| **Jump to end** | Moves the playhead to the end of the recording. |

The displayed shortcuts are configurable.

## Job information and Annotation Mode

| Control | Description |
| --- | --- |
| **Fullscreen** | Toggles fullscreen mode for the Audio Editor. |
| **Guide** | Opens the task guide when one is configured. |
| **Info** | Opens job statistics, including the total audio duration, interval count, and per-label interval counts, duration, and coverage. |
| **Filters** | Restricts the intervals shown in the sidebar and waveform. See {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "Filters" >}}. |
| **Annotation mode** | The drop-down list to switch between different annotation modes: <br> **Audio annotation** is currently the only available annotation mode for audio jobs. |
