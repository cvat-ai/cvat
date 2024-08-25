---
title: 'Shortcuts'
linkTitle: 'Shortcuts'
weight: 23
description: 'List of available mouse and keyboard shortcuts and their customization.'
---

CVAT provides a wide range of customizable shortcuts, with many UI elements offering shortcut hints when hovered over with the mouse.

![](/images/image075.jpg)

These shortcuts are organized by scopes. Some are global, meaning they work across the entire application, while others are specific to certain sections or workspaces. This setup allows for shortcut reuse in different scopes, depending on whether they might conflict. For example, global shortcuts must be unique since they apply across all pages and workspaces. However, similar shortcuts can be used in different workspaces, like having the same shortcuts in both the Standard Workspace and the Standard 3D Workspace, as these two do not coexist.

| **Scope**                        | **Shortcut Conflicts**                                                                       |
|----------------------------------|----------------------------------------------------------------------------------------------|
| **Global**                       | Must be unique across all scopes, as they apply universally.                                 |
| **Annotation Page**              | Must be unique across all scopes, except Labels Editor.                                      |
| **Standard Workspace**           | Must be unique across itself, Annotation Page and Global Scope.                              |
| **Standard 3D Workspace**        | Must be unique across itself, Annotation Page and Global Scope.                              |
| **Attribute Annotation Workspace** | Must be unique across itself, Annotation Page and Global Scope.                            |
| **Review Workspace**             | Must be unique across itself, Annotation Page and Global Scope.                              |
| **Tag Annotation Workspace**     | Must be unique across itself, Annotation Page and Global Scope.                              |
| **Control Sidebar**              | Must be unique across itself, all workspaces, Annotation Page and Global Scope.              |
| **Objects Sidebar**              | Must be unique across itself, all workspaces, Annotation Page and Global Scope.              |
| **Labels Editor**                | Must be unique across itself and Global Scope.                                               |

## Shortcuts Customization

You can customize shortcuts in the CVAT settings.

- Open Settings:\
![](/images/shortcuts01.png)

- Go to the Shortcuts tab:\
![](/images/shortcuts02.png)

- You'll see the shortcuts customization menu:\
![](/images/shortcuts03.png)

- As it can be seen there is a warning, that some shortcuts are reserved by the browser and cannot be overridden by CVAT, there isn't a specific list available for such combinations, but shortcuts such as ctrl + tab (switching tabs) or ctrl + w (closing tabs) etc, are reserved by the browser.

- All these are collapsable, so you can easily navigate through the list of shortcuts. Here is the Global scope expanded:\
![](/images/shortcuts04.png)

- To add a custom shortcut all you have to do is click in the input field and start pressing the sequence you want to assign to the action. As an example `f3` has been set here for Show Shortcuts along with `f1`:\
![](/images/shortcuts05.png)

- Shortcuts can be added as a combination like `ctrl+shift+key` and with a gap between the keys like `ctrl+shift alt+key` as well.\
![](/images/shortcuts06.png)

- But if you try to add a shortcut that is already in use, you will get a warning message:\
![](/images/shortcuts07.png)

- If pressed cancel it will remain the same otherwise the conflicting shortcut will be unset.\
![](/images/shortcuts08.png)

- If you want to reset all the shortcuts to default, you can do so by clicking the Restore Defaults button at the top of the shortcut settings.\
![](/images/shortcuts09.png)

## Available Shortcuts

| Shortcut                   | Common                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
|                            | _Main functions_                                                                                         |
| `F1`                       | Open/hide the list of available shortcuts                                                                |
| `F2`                       | Go to the settings page or go back                                                                       |
| `Ctrl+S`                   | Save the current job                                                                                     |
| `Ctrl+Z`                   | Cancel the latest action related with objects                                                            |
| `Ctrl+Shift+Z` or `Ctrl+Y` | Cancel undo action                                                                                       |
| Hold `Mouse Wheel`         | To move an image frame (for example, while drawing)                                                      |
| `Esc`                      | Cancel the active canvas mode or skeleton edge                                                           |
|                            | _Player_                                                                                                 |
| `F`                        | Go to the next frame                                                                                     |
| `D`                        | Go to the previous frame                                                                                 |
| `V`                        | Go forward with a step                                                                                   |
| `C`                        | Go backward with a step                                                                                  |
| `Right`                    | Search the next frame that satisfies to the filters <br> or next frame which contain any objects         |
| `Left`                     | Search the previous frame that satisfies to the filters <br> or previous frame which contain any objects |
| `Space`                    | Start/stop automatic changing frames                                                                     |
| `` ` `` or `~`             | Focus on the element to change the current frame                                                         |
|                            | _Modes_                                                                                                  |
| `N` or `Shift+N`           | Repeat the latest procedure of drawing with the same parameters or switch draw mode                      |
| `M`                        | Activate or deactivate mode to merging shapes                                                            |
| `Alt+M`                    | Activate or deactivate mode to splitting shapes                                                          |
| `G`                        | Activate or deactivate mode to grouping shapes                                                           |
| `Shift+G`                  | Reset group for selected shapes (in group mode)                                                          |
| `Esc`                      | Cancel any active canvas mode or skeleton edge                                                           |
|                            | _Image operations_                                                                                       |
| `Ctrl+R`                   | Rotate the image clockwise (add 90 degrees)                                                              |
| `Ctrl+Shift+R`             | Rotate the image counterclockwise (subtract 90 degrees)                                                  |
|                            | _Operations with objects_                                                                                |
| `Ctrl+A`                   | Switch automatic bordering for polygons and polylines during drawing/editing                             |
| Hold `Ctrl`                | When the shape is active and fix it                                                                      |
| `Alt+Click` on point       | Deleting a point (used when hovering over a point of polygon, polyline, points)                          |
| `Shift+Click` on point     | Editing a shape (used when hovering over a point of polygon, polyline, or points)                        |
| `Right-Click` on shape     | Display of an object element from the objects sidebar                                                    |
| `T+L`                      | Change locked state for all objects in the sidebar                                                       |
| `L`                        | Change locked state for an active object                                                                 |
| `T+H`                      | Change hidden state for objects in the sidebar                                                           |
| `H`                        | Change hidden state for an active object                                                                 |
| `Q` or `/`                 | Change occluded property for an active object                                                            |
| `Del` or `Shift+Del`       | Delete an active object. Use shift to force delete of locked objects                                     |
| `-` or `_`                 | Put an active object "farther" from the user (decrease z axis value)                                     |
| `+` or `=`                 | Put an active object "closer" to the user (increase z axis value)                                        |
| `Ctrl+C`                   | Copy shape to CVAT internal clipboard                                                                    |
| `Ctrl+V`                   | Paste a shape from internal CVAT clipboard                                                               |
| Hold `Ctrl` while pasting  | When pasting shape from the buffer for multiple pasting                                                  |
| `Ctrl+B`                   | Propagate an object to the following frames                                                              |
| `Ctrl+(0..9)`              | Switch label for an activated object or the next drawn object if no objects are activated                |
|                            | _Operations available only for track_                                                                    |
| `K`                        | Switch keyframe property for an active track                                                             |
| `O`                        | Switch outside property for an active track                                                              |
| `R`                        | Go to the next keyframe of an active track                                                               |
| `E`                        | Go to the previous keyframe of an active track                                                           |
|                            | _Attribute annotation mode_                                                                              |
| `Up Arrow`                 | Go to the previous attribute (up)                                                                        |
| `Down Arrow`               | Go to the next attribute (down)                                                                          |
| `Tab`                      | Go to the next annotated object in the current frame                                                     |
| `Shift+Tab`                | Go to the previous annotated object in the current frame                                                 |
| `<number>`                 | Assign a corresponding value to the current attribute                                                    |
|                            | _Standard 3D mode_                                                                                       |
| `Shift+Up Arrow`           | Tilt camera up                                                                                           |
| `Shift+Down Arrow`         | Tilt camera down                                                                                         |
| `Shift+Left Arrow`         | Rotate camera left                                                                                       |
| `Shift+Right Arrow`        | Rotate camera right                                                                                      |
| `Alt+O`                    | Move the camera up                                                                                       |
| `Alt+U`                    | Move the camera down                                                                                     |
| `Alt+J`                    | Move the camera left                                                                                     |
| `Alt+L`                    | Move the camera right                                                                                    |
| `Alt+I`                    | Performs zoom in                                                                                         |
| `Alt+K`                    | Performs zoom out                                                                                        |
|                            | _Additional Operations_                                                                                  |
| `P`                        | Toggle pinned state for the active object                                                                |
| `Ctrl+Shift+R`             | Rotate the image anticlockwise (subtract 90 degrees)                                                     |
| `Shift+G`                  | Reset group for selected shapes                                                                          |
| `Alt+Del`                  | Delete frame                                                                                             |
| `Enter`                    | Change object color                                                                                      |
| `T+L`                      | Switch all objects to locked state                                                                       |
| `T+H`                      | Switch all objects to hidden state                                                                       |
| `Ctrl+Alt+Enter`           | Toggle annotation page                                                                                   |
| `Ctrl+B`                   | Propagate object                                                                                         |
| `Ctrl+C`                   | Copy shape                                                                                               |
| `Ctrl+V`                   | Paste shape                                                                                              |
| `Ctrl+(0..9)`              | Switch label                                                                                             |
| `1-9` or `Shift+1-9`       | Assign tag                                                                                               |
| `Esc`                      | Cancel                                                                                                   |
