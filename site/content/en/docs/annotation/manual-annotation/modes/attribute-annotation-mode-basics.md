---
title: 'Attribute annotation mode'
linkTitle: 'Attribute annotation mode'
weight: 5
description: 'Usage examples and basic operations available in attribute annotation mode.'
aliases:
- /docs/manual/basics/attribute-annotation-mode-basics/
- /docs/manual/advanced/attribute-annotation-mode-advanced/
- /docs/annotation/tools/attribute-annotation-mode-basics/
- /docs/annotation/tools/attribute-annotation-mode-advanced/
---
- In this mode, you can edit attributes with fast navigation between objects and frames using a keyboard.
  Open the drop-down list in the top panel and select **Attribute annotation**.

  ![User interface with opened menu for changing annotation mode](/images/Attribute%20annotation%20mode_01.png)

- In this mode, objects panel change to a special panel:

  ![Object panel interface in attribute annotation mode with marked elements](/images/Attribute%20annotation%20mode_02.png)

- The active attribute will be red. In this case, it is `gender`. Look at the bottom side panel to see all possible
  shortcuts for changing the attribute. Press key `2` on your keyboard to assign a value (female) for the attribute
  or select from the drop-down list.

  ![Example of assigning an attribute value in objects sidebar](/images/Attribute%20annotation%20mode_03.png)

- Press `Up Arrow`/`Down Arrow` on your keyboard or select the buttons in the UI to go to the next/previous
  attribute. In this case, after pressing `Down Arrow` you will be able to edit the `Age` attribute.

  ![Example of selecting an attribute value in objects sidebar with keyboard](/images/Attribute%20annotation%20mode_04.png)

- Use `Right Arrow`/`Left Arrow` keys to move to the previous/next image with annotation.

To display all the hot keys available in the attribute annotation mode, press `F2`.

It is possible to handle lots of objects on the same frame in the mode.

![Example of user interface in attribute annotation mode](/images/image058_detrac.jpg)

It is more convenient to annotate objects of the same type. In this case you can apply
the appropriate filter. For example, the following filter will
hide all objects except person: `label=="Person"`.

To navigate between objects (person in this case),
use the following buttons `switch between objects in the frame` on the special panel:

![Panel for attribute annotation with marked options and parameters](/images/image026.jpg)

or shortcuts:

- `Tab` — go to the next object
- `Shift+Tab` — go to the previous object.

In order to change the zoom level, go to settings (press `F3`) in the workspace tab and set the value Attribute annotation mode (AAM) zoom margin in px.
