# User's guide

[toc]

Computer Vision Annotation Tool (CVAT) is a web-based tool which helps to annotate video and images for Computer Vision algorithms. It was inspired by [Vatic](http://carlvondrick.com/vatic/) free, online, interactive video annotation tool. CVAT has many powerful features: __interpolation of bounding boxes between key frames, automatic annotation using TensorFlow OD API, shortcuts for most of critical actions, dashboard with a list of annotation tasks, LDAP and basic authorization, etc...__ It was created for and used by a professional data annotation team. UX and UI were optimized especially for computer vision tasks developed by our team.

## Getting started

### Authorization
- First of all you have to log in to CVAT tool.

    ![](static/documentation/images/image001.jpg)

    ![](static/documentation/images/image002.jpg)

- If you don't have an account you have to create it using the link below the login page.

    ![](static/documentation/images/image003.jpg)

### Administration panel
Type ``/admin`` in URL to go to the administration panel.
There you can:
 - Create / edit / delete users
 - Control user's permission and access to the tool.


### Creating an annotation task

1. Create an annotation task by pressing ``Create New Task`` button on the main page.

    ![](static/documentation/images/image004.jpg)

2. Specify mandatory parameters of the task. You have to fill ``Name``, ``Labels`` and ``Select Files`` at least.

    ![](static/documentation/images/image005.jpg)

    __Labels__. Use the following schema to create labels: ``label_name <prefix>input_type=attribute_name:attribute_value1,attribute_value2``

    Example: ``vehicle @select=type:__undefined__,car,truck,bus,train ~radio=quality:good,bad ~checkbox=parked:false``

    ``label_name``: for example *vehicle, person, face etc.*

    ``<prefix>``:
      - Use ``@`` for unique attributes which cannot be changed from frame to frame *(e.g. age, gender, color, etc)*
      - Use ``~`` for temporary attributes which can be changed on any frame *(e.g. quality, pose, truncated, etc)*

    ``input_type``: the following input types are available ``select``, ``checkbox``, ``radio``, ``number``, ``text``.

    ``attribute_name``: for example *age, quality, parked*

    ``attribute_value``: for example *middle-age, good, true*

    Default value for an attribute is the first value after "``:``".

    For ``select`` and ``radio`` input types the special value is available: ``__undefined__``. Specify this value first if an attribute should be annotated explicity.


    __Bug Tracker__. Specify full URL your bug tracker if you have it.

    __Source__. To create huge tasks please use ``shared`` server directory (choose ``Share`` option in the dialog).

    __Overlap Size__. Use this option to make overlapped segments. The option makes tracks continuous from one segment into another. Use it for interpolation mode.

    __Segment size__. Use this option to divide huge dataset on several segments.

    __Image Quality__. Use this option to specify quality of uploaded images. The option makes it faster to load high-quality datasets. Use the value from ``1`` (completely compressed images) to ``95`` (almost not compressed images).

    Push ``Submit`` button and it will be added into the list of annotation tasks. Finally you should see something similar to the figure below:

    ![](static/documentation/images/image006.jpg)

3. Follow a link inside ``Jobs`` section to start annotation process. In some cases you can have several links. It depends on size of your task and ``Overlap Size`` and ``Segment Size`` parameters. To improve UX only several first frames will be loaded and you will be able to annotate first images. Other frames will be loaded in background.

    ![](static/documentation/images/image007.jpg)

### Basic navigation

1. Use arrows below to move on next/previous frame. Mostly every button is covered by a shortcut. To get a hint about the shortcut just put your mouse pointer over an UI element.

    ![](static/documentation/images/image008.jpg)

2. An image can be zoom in/out using mouse's wheel. The image will be zoomed relatively your current cursor position. Thus if you point on an object it will be under your mouse during zooming process.

3. An image can be moved/shifted by holding left mouse button inside some area without annotated objects. If ``Shift`` key is pressed then all annotated objects are ignored otherwise a highlighted bounding box will be moved instead of the image itself. Usually the functionality is used together with zoom to precisely locate an object of interest.

### Annotation mode (basics)
Usage examples:
 - Create new annotations for a set of images.
 - Add/modify/delete objects for existing annotations.

1. Before start need to be sure that ``Annotation`` is selected.

    ![](static/documentation/images/image009.jpg)

2. Create a new annotation:
  - Choose an object's ``label``. When you created an annotation task you had to specify one or several labels with attributes.

    ![](static/documentation/images/image010.jpg)

  - Create a bounding box by clicking on ``Create Track`` button or ``N`` shortcut. Choose left top and right bottom points. Your first bounding box is ready! It is possible to adjust boundaries and location of the bounding box using mouse.

    ![](static/documentation/images/image011.jpg)

3. In the list of objects you can see the labeled car. In the side panel you can perform basic operations under the object.

    ![](static/documentation/images/image012.jpg)

4. An example of fully annotated frame in ``Annotation`` mode can look like on the figure below.

    ![](static/documentation/images/image013.jpg)

### Interpolation mode (basics)
Usage examples:
 - Create new annotations for a sequence of frames.
 - Add/modify/delete objects for existing annotations.
 - Edit tracks, merge many bounding boxes into one track.

1. Before start need to be sure that ``Interpolation`` is selected.

    ![](static/documentation/images/image014.jpg)

2. Create a track for an object (look at the selected car as an example):
    - Annotate a bounding box on first frame for the object.

    - In ``Interpolation`` mode the bounding box will be interpolated on next frames automatically.

        ![](static/documentation/images/image015.jpg)

3. If the object starts to change its position you need to modify bounding boxes where it happens. Changing of bounding boxes on each frame isn't necessary. It is enough to update several key frames and frames between them will be interpolated automatically. See an example below:
    - The car starts moving on frame #70. Let's mark the frame as a key frame.

        ![](static/documentation/images/image016.jpg)

    - Let's jump 30 frames forward and adjust boundaries of the object.

        ![](static/documentation/images/image017.jpg)

    - After that bounding boxes of the object between 70 and 100 frames will be changed automatically. For example, frame #85 looks like on the figure below:

        ![](static/documentation/images/image018.jpg)

4. When the annotated object disappears or becomes too small, you need to finish the track. To do that you need to choose ``Outsided Property``.

    ![](static/documentation/images/image019.jpg)

5. If the object isn't visible on a couple of frames and after that it appears again it is possible to use ``Merge Tracks`` functionality to merge several separated tracks into one.

    ![](static/documentation/images/image020.jpg)

    - Let's create a track for the bus.

        ![](static/documentation/images/gif001.gif)

    - After that create a track when it appears again on the sequence of frames.

        ![](static/documentation/images/gif002.gif)

    - Press ``Merge Tracks`` button and click on any bounding box of first track and on any bounding box of second track.

        ![](static/documentation/images/image021.jpg)

    - Press ``Apply Merge`` button to apply changes.

        ![](static/documentation/images/image022.jpg)

    - The final annotated sequence of frames in ``Interpolation`` mode can look like the clip below:

        ![](static/documentation/images/gif003.gif)

### Attribute Annotation mode (basics)
Usage examples:
- Edit attributes using keyboard with fast navigation between objects and frames.

1. To enter into ``Attribute Annotation`` mode press ``Shift+Enter`` shortcut. After that it is possible to change attributes using keyboard.

    ![](static/documentation/images/image023.jpg)

2. The active attribute will be red. In this case it is ``Age``.

    ![](static/documentation/images/image024.jpg)

3. Look at the bottom side panel to see all possible shortcuts to change the attribute. Press ``4`` key on your keyboard to assign ``adult`` value for the attribute.

    ![](static/documentation/images/image025.jpg)

4. Press ``Up Arrow``/``Down Arrow`` keys on your keyboard to go to next attribute .

    ![](static/documentation/images/image026.jpg)

5. In this case after pressing ``Down Arrow`` you will be able to edit ``Gender`` attribute.

    ![](static/documentation/images/image027.jpg)

6. Use ``Right Arrow``/``Left Arrow`` keys to move on previous/next image.

### Downloading annotations

1. To download latest annotations save all changes first. Press ``Open Menu`` and then ``Save Work`` button. There is ``Ctrl+s`` shortcut to save annotations quickly.

2. After that press ``Open Menu`` and then ``Dump Annotation`` button.

    ![](static/documentation/images/image028.jpg)

3. The annotation will be written into **.xml** file. To find the annotation file go to the directory where your browser saves downloaded files by default. For more information visit [XML annotation format](/documentation/xml_format.html) description.


### Vocabulary

**Bounding box** is an area which defines boundaries of an object. To specify it you need to define top left and bottom right points.

**Tight bounding box** is a bounding box where margin between the object inside and boundaries of the box is absent. By default the type of bounding box is used in most tasks but precision completely depends on an annotation task.

| Bounding box |Tight bounding box|
| ------------ |:----------------:|
| ![](static/documentation/images/image030.jpg) | ![](static/documentation/images/image031.jpg)|

---
**Label** is a type of an annotated object (e.g. person, car, face, etc)

![](static/documentation/images/image032.jpg)

---

**Attribute** is a property of an annotated object (e.g. color, model, quality, etc). There are two types of attributes:

- __Unique__: immutable and isn't changed from frame to frame (e.g age, gender, color, etc)
- __Temporary__: mutable and can be changed on any frame (e.g. quality, pose, truncated, etc)

    ![](static/documentation/images/image033.jpg)

---
**Track** is a set of bounding boxes on different frames which corresponds to one object. Tracks are created in ``Interpolation`` mode.

![](static/documentation/images/gif004.gif)

---
**Annotation** is a set of bounding boxes and tracks. There are several types of annotations:
- *Manual* which is created by a person
- *Semi-automatic* which is created automatically but modified by a person
- *Automatic* which is created automatically without a person in the loop

## Interface of the annotation tool

![](static/documentation/images/image034.jpg)

---
### Navigation by frames/images

![](static/documentation/images/image035.jpg)

---
Go to the first and latest frames.

![](static/documentation/images/image036.jpg)

---
Go to the next/previous frame with a predefined step. Shortcuts: ``v`` — step backward, ``c`` — step forward. By default the step is ``10``.

![](static/documentation/images/image037.jpg)

To change the predefined step go to settings (``Open Menu`` —> ``Settings``) and modify ``Player Step`` property.

![](static/documentation/images/image038.jpg)

![](static/documentation/images/image039.jpg)

---
Go to the next/previous frame with step equals to 1. Shortcuts: ``d`` — previous, ``f`` — next.

![](static/documentation/images/image040.jpg)

---
Play the sequence of frames or the set of images. Shortcut: ``Space``.

![](static/documentation/images/image041.jpg)

To adjust player speed go to settings (``Open Menu`` —> ``Settings``) and modify a value of ``Player Speed`` property.

![](static/documentation/images/image042.jpg)

Go to specified frame.

![](static/documentation/images/image060.jpg)


### Bottom side panel

![](static/documentation/images/image043.jpg)

### Side panel (list of objects)

In the side panel you can see the list of available objects on the current frame. An example how the list can look like below:

|Annotation mode|Interpolation mode|
|--|--|
|![](static/documentation/images/image044.jpg)|![](static/documentation/images/image045.jpg)|

---

A bounding box can be locked to prevent its modification or moving by an accident. Shortcut to lock an object: ``l``.

![](static/documentation/images/image046.jpg)

---
A bounding box can be removed. Shortcut: ``Delete``. A locked bounding box can be deleted using ``Shift+Delete`` shortcut.

![](static/documentation/images/image047.jpg)

---
A bounding box can be **Occluded**. Shortcut: ``q``. Such bounding boxes have dashed boundaries.

![](static/documentation/images/image048.jpg)

![](static/documentation/images/image049.jpg)

---
The type of a bounding box can be changed by selecting __Label__ property. For instance, it can look like on the figure below:

![](static/documentation/images/image050.jpg)

To change a type of a bounding box using keyboard you need to press ``Shift+<number>``.

### Open Menu
It is the main menu for the annotation tool. It can be used to download, upload and remove annotations. As well it shows statistics about the current annotation task.

![](static/documentation/images/image051.jpg)

### Settings

The menu contains different parameters which can be adjust by the user needs. For example, ``Auto Saving Internal``, ``Player Step``, ``Player Speed``.

![](static/documentation/images/image052.jpg)

 - ``Brightness`` makes it appear that there is more or less light within the image.
 - ``Contrast`` controls the difference between dark and light parts of the image
 - ``Saturation`` takes away all color or enhance the color.

## Annotation mode (advanced)

Basic operations in the mode was described above.

__occluded__ attribute is used if an object is occluded by another object or it isn't fully visible on the frame. Use ``q`` shortcut to set the property quickly.

![](static/documentation/images/image053.jpg)

Example: both cars on the figure below should be labeled as __occluded__.

![](static/documentation/images/image054.jpg)

If a frame contains too many objects and it is difficult to annotate them due to many bounding boxes are placed mostly in the same place when it makes sense to lock them. Bounding boxes for locked objects are transparent and it is easy to annotate new objects. Also it will not be possible to change previously annotated objects by an accident. Shortcut: ``l``.

![](static/documentation/images/image055.jpg)

## Interpolation mode (advanced)

Basic operations in the mode was described above.

Bounding boxes created in the mode have extra navigation buttons.
- These buttons help to jump to previous/next key frame.

    ![](static/documentation/images/image056.jpg)

- The button helps to jump to initial frame for the object (first bounding box for the track).

    ![](static/documentation/images/image057.jpg)


## Attribute Annotation mode (advanced)

Basic operations in the mode was described above.

It is possible to handle many objects on the same frame in the mode.

![](static/documentation/images/image058.jpg)

It is more convenient to annotate objects of the same type. For the purpose it is possible to specify a corresponding filter. For example, the following filter will hide all objects except pedestrians: ``//pedestrian``.

To navigate between objects (pedestrians in the case) use the following shortcuts:
- ``Tab`` - go to the next object
- ``Shift+Tab`` - go to the previous object.

By default in the mode objects are zoomed. To disable the functionality uncheck the corresponding setting: ``Open Menu`` —> ``Settings`` —> ``Zoom boxes in Attribute Annotation Mode``.

By default other objects are hidden. To change the behaviour uncheck the corresponding setting: ``Open Menu`` —> ``Setting`` —> ``Hide Other in Attribute Annotation Mode``.

## Filter

![](static/documentation/images/image059.jpg)

There are several reasons to use the feature:

1. When use a filter objects which don't correspond to the filter will be hidden. Use ``Settings`` —> ``Hide Filtered Tracks`` or ``K`` shortcut if you want to change the behaviour.
2. Fast navigation between frames which have an object of interest. Use ``Left Arrow/Right Arrow`` keys for the purpose. If the filter is empty the mentioned arrows will go to previous/next frames.

To use the functionality it is enough to specify a value inside ``Filter`` text box and defocus the text box (for example, click on the image). After that the filter will be applied.

---
In a trivial case a correct filter should correspond to the template: ``//label[prop operator "value"]``

``label`` is a type of an object (e.g _person, car, face_, etc). If the type isn't important you can use ``*``.

``prop`` is a property which should be filtered. The following items are available:

 - ``id`` — identifier of an object. It helps to find a specific object easily in case of huge number of objects and images/frames.
 - ``type`` — an annotation type. Possible values:
    - ``annotation``
    - ``interpolation``
 - ``lock`` accepts ``true`` and ``false`` values. It can be used to hide all locked objects.
 - ``occluded`` accepts ``true`` and ``false`` values. It can be used to hide all occluded objects.
 - ``attr`` is a prefix to access attributes of an object. For example, it is possible to access _race_ attribute. For the purpose you should specify ``attr/race``. To access all attributes it is necessary to write ``attr/*``.

``operator`` can be ``=`` (equal), ``!=`` (not equal), ``<`` (less), ``>`` (more), ``<=`` (less or equal), ``>=`` (more or equal).

``"value"`` — value of an attribute or a property. It has to be specified in quotes.

---

Example                        | Description
-------------------------------|-------------
``//face``                     | all faces
``//*[id=4]``                  | object with id #4
``//*[type="annotation"]``     | *annotation* objects only
``//car[occluded="true"]``     | cars with *occluded* property
``//*[lock!="true"]``          | all unlocked objects
``//car[attr/parked="true"]``  | parked cars
``//*[attr/*="__undefined__"]``| any objects with ``__undefined__`` value of an attribute

---

The functionality allows to create more complex conditions. Several filters can be combined by ``or``, ``and``, ``|`` operators. Operators ``or``, ``and`` can be applied inside square brackets. ``|`` operator (union) can be applied outside of square brackets.

Example                                                 | Description
--------------------------------------------------------|-------------
``//person[attr/age>="25" and attr/age<="35"]``         | people with age between 25 and 35.
``//face[attr/glass="sunglass" or attr/glass="no"]``    | faces with sunglasses or without glasses at all.
```//person[attr/race="asian"] | //car[attr/model="bmw" or attr/model="mazda"]``` | asian persons or bmw or mazda cars.


## Shortcuts

Many UI elements have shortcut hints. Put your pointer to an interesting element to see it.

![](static/documentation/images/image061.jpg)

![](static/documentation/images/image062.jpg)

| Shortcut             | Common                        |
-----------------------|------------------------------
``L``                  | lock/unlock a selected object
``L+T``                | lock/unlock all objects and tracks on the current frame
``Q`` or ``Num-``      | set occluded property for a selected object
``N``                  | create a new annotated object
``Ctrl+<number>``      | change type of new objects by default
``Shift+<number>``     | change type of a selected object
``Enter``              | change color of bounding box for a selected object
``H``                  | hide bounding boxes on every frame
``J``                  | hide labels with attributes on every frame
``Delete``             | delete a selected object
``Shift+Delete``       | delete a selected object even if it is locked
``F``                  | go to next frame
``D``                  | go to previous frame
``V``                  | go forward with a predefined step
``C``                  | go backward with a predefined step
``Ctrl+C``             | copy a selected object
``Ctrl+V``             | insert a copied object
``F1``                 | open help
``F1`` in dashboard    | open page with documentation
``F2``                 | open settings
``Ctrl+S``             | save job
|                      | __Interpolation__             |
``M``                  | enter/apply merge mode
``Ctrl+M``             | leave merge mode without saving changes
``R``                  | go to the next key frame of a selected object
``E``                  | go to the previous key frame of a selected object
|                      | __Attribute annotation mode__ |
``Shift+Enter``        | enter/leave Attribute Annotation mode
``Up Arrow``           | go to the next attribute (up)
``Down Arrown``        | go to the next attribute (down)
``Tab``                | go to the next annotated object
``Shift+Tab``          | go to the previous annotated object
``<number>``           | assign a corresponding value to the current attribute
|                      | __Filter__                    |
``Left Arrow``         | go to the previous frame which corresponds to the specified filter value
``Right Arrow``        | go to the next frame which corresponds to the specified filter value
``K``                  | hide all objects which don't correspond to the specified filter value
