---
title: 'Shortcuts'
linkTitle: 'Shortcuts'
weight: 23
description: 'List of available keyboard shortcuts and notes about their customization.'
---

CVAT provides a wide range of customizable shortcuts, with many UI elements
 offering shortcut hints when hovered over with the mouse.

![](/images/image075.jpg)

These shortcuts are organized by scopes. Some are global, meaning they work across the entire application,
 while others are specific to certain sections or workspaces.
 This approach allows reusing the same shortcuts in different scopes, depending on whether they might conflict.
 For example, global shortcuts must be unique since they apply across all pages and workspaces.
 However, similar shortcuts can be used in different workspaces, like having the same shortcuts
 in both the Standard Workspace and the Standard 3D Workspace, as these two do not coexist.

| **Scope**                        | **Shortcut Conflicts**                                                          |
|----------------------------------|---------------------------------------------------------------------------------|
| **Global**                       | Must be unique across all scopes, as they apply universally.                    |
| **Annotation Page**              | Must be unique across all scopes, except Labels Editor.                         |
| **Standard Workspace**           | Must be unique across itself, Annotation Page and Global Scope.                 |
| **Standard 3D Workspace**        | Must be unique across itself, Annotation Page and Global Scope.                 |
| **Attribute Annotation Workspace** | Must be unique across itself, Annotation Page and Global Scope.               |
| **Review Workspace**             | Must be unique across itself, Annotation Page and Global Scope.                 |
| **Tag Annotation Workspace**     | Must be unique across itself, Annotation Page and Global Scope.                 |
| **Control Sidebar**              | Must be unique across itself, all workspaces, Annotation Page and Global Scope. |
| **Objects Sidebar**              | Must be unique across itself, all workspaces, Annotation Page and Global Scope. |
| **Labels Editor**                | Must be unique across itself and Global Scope.                                  |

## Shortcuts Customization

You can customize shortcuts in CVAT settings.

- Open Settings:\
![](/images/shortcuts01.png)

- Go to the Shortcuts tab:\
![](/images/shortcuts02.png)

- You'll see the shortcuts customization menu:\
![](/images/shortcuts03.png)

- As it can be seen there is a warning, that some shortcuts are reserved by a browser and cannot be overridden in CVAT,
 there isn't a specific list available for such combinations, but shortcuts such as ctrl + tab (switching tabs) or
 ctrl + w (closing tabs) etc, are reserved by the browser and shortcuts such as alt + f4 (closing the window)
 are usually reserved by your operating system.

- All sections collapsable, so you can easily navigate through the list of shortcuts.
 Here is the Global scope expanded:\
![](/images/shortcuts04.png)

- To add a custom shortcut all you have to do is to click the input field and start pressing the sequence you want
 to assign to the action. As an example `f3` has been set here for Show Shortcuts along with `f1`:\
![](/images/shortcuts05.png)

- Shortcuts can be any combination of modifiers (ctrl, shift or alt) and up to one non-modifier key e.g. `ctrl+shift+f1` etc.\
![](/images/shortcuts06.png)

- If you try to add a shortcut that is already in use, you will get a warning message:\
![](/images/shortcuts07.png)

- If pressed cancel it will remain the same otherwise the conflicting shortcut will be unset.\
![](/images/shortcuts08.png)

- If you want to reset all the shortcuts to default, you can do so by clicking the
 Restore Defaults button at the top of the shortcut settings.\
![](/images/shortcuts09.png)
