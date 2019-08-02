## Description

The purpose of this application is to add support for multiple annotation formats for CVAT.
It allows to download and upload annotations in different formats and easily add support for new.

## How to add a new annotation format support

1.  Write a python script that will be executed via exec() function. Following items must be defined inside at code:
    - **format_spec** - a dictionary with the following structure:
      ```python
      format_spec = {
        "name": "CVAT",
        "dumpers": [
            {
                "display_name": "{name} {format} {version} for videos",
                "format": "XML",
                "version": "1.1",
                "handler": "dump_as_cvat_interpolation"
            },
            {
                "display_name": "{name} {format} {version} for images",
                "format": "XML",
                "version": "1.1",
                "handler": "dump_as_cvat_annotation"
            }
        ],
        "loaders": [
            {
                "display_name": "{name} {format} {version}",
                "format": "XML",
                "version": "1.1",
                "handler": "load",
            }
        ],
      }
      ```
      - **name** - unique name for each format
      - **dumpers and loaders** - lists of objects that describes exposed dumpers and loaders and must
        have following keys:
        1. display_name - **unique** string used as ID for a dumpers and loaders.
           Also this string is displayed in CVAT UI.
           Possible to use a named placeholders like the python format function
           (supports only name, format and version variables).
        1. format - a string, used as extension for a dumped annotation.
        1. version - just string with version.
        1. handler - function that will be called and should be defined at top scope.
    - dumper/loader handler functions. Each function should have the following signature:
      ```python
      def dump_handler(file_object, annotations):
      ```

    Inside of the script environment 3 variables are available:
    - file_object - python's standard file object returned by open() function and exposing a file-oriented API
    (with methods such as read() or write()) to an underlying resource.
    - **annotations** - instance of [Annotation](annotation.py#L106) class.
    - **spec** - string with name of the requested specification
    (if the annotation format defines them).
    It may be useful if one script implements more than one format support.

    Annotation class expose API and some additional pre-defined types that allow to get/add shapes inside
    a parser/dumper code.

    Short description of the public methods:
    - **Annotation.shapes** - property, returns a generator of Annotation.LabeledShape objects
    - **Annotation.tracks** - property, returns a generator of Annotation.Track objects
    - **Annotation.tags** - property, returns a generator of Annotation.Tag objects
    - **Annotation.group_by_frame()** - method, returns an iterator on Annotation.Frame object,
      which groups annotation objects by frame. Note that TrackedShapes will be represented as Annotation.LabeledShape.
    - **Annotation.meta** - property, returns dictionary which represent a task meta information,
      for example - video source name, number of frames, number of jobs, etc
    - **Annotation.add_tag(tag)** - tag should be a instance of the Annotation.Tag class
    - **Annotation.add_shape(shape)** - shape should be a instance of the Annotation.Shape class
    - **Annotation.add_track(track)** - track should be a instance of the Annotation.Track class
    - **Annotation.Attribute** = namedtuple('Attribute', 'name, value')
      - name - String, name of the attribute
      - value - String, value of the attribute
    - **Annotation.LabeledShape** = namedtuple('LabeledShape', 'type, frame, label, points, occluded, attributes,
      group, z_order')
      LabeledShape.\__new\__.\__defaults\__ = (0, None)
    - **TrackedShape** = namedtuple('TrackedShape', 'type, points, occluded, frame, attributes, outside,
      keyframe, z_order')
      TrackedShape.\__new\__.\__defaults\__ = (None, )
    - **Track** = namedtuple('Track', 'label, group, shapes')
    - **Tag** = namedtuple('Tag', 'frame, label, attributes, group')
      Tag.\__new\__.\__defaults\__ = (0, )
    - **Frame** = namedtuple('Frame', 'frame, name, width, height, labeled_shapes, tags')

    Pseudocode for a dumper script
    ```python
    ...
    # dump meta info if necessary
    ...

    # iterate over all frames
    for frame_annotation in annotations.group_by_frame():
        # get frame info
        image_name = frame_annotation.name
        image_width = frame_annotation.width
        image_height = frame_annotation.height

        # iterate over all shapes on the frame
        for shape in frame_annotation.labeled_shapes:
            label = shape.label
            xtl = shape.points[0]
            ytl = shape.points[1]
            xbr = shape.points[2]
            ybr = shape.points[3]

            # iterate over shape attributes
            for attr in shape.attributes:
                attr_name = attr.name
                attr_value = attr.value
    ...
    # dump annotation code
    file_object.write(...)
    ...
    ```
    Pseudocode for a parser code
    ```python
    ...
    #read file_object
    ...

    for parsed_shape in parsed_shapes:
        shape = annotations.LabeledShape(
            type="rectangle",
            points=[0, 0, 100, 100],
            occluded=False,
            attributes=[],
            label="car",
            outside=False,
            frame=99,
        )

        annotations.add_shape(shape)
    ```
    Full examples can be found in [builtin](builtin) folder.
1.  Add path to a new python script to the annotation app settings:

    ```python
    BUILTIN_FORMATS = (
      os.path.join(path_prefix, 'cvat.py'),
      os.path.join(path_prefix,'pascal_voc.py'),
    )
    ```

## Ideas for improvements

- Annotation format manager like DL Model manager with which the user can add custom format support by
  writing dumper/loader scripts.
- Often a custom loader/dumper requires additional python packages and it would be useful if CVAT provided some API
  that allows the user to install a python dependencies from their own code without changing the source code.
  Possible solutions: install additional modules via pip call to a separate directory for each Annotation Format
  to reduce version conflicts, etc. Thus, custom code can be run in an extended environment, and core CVAT modules
  should not be affected. As well, this functionality can be useful for Auto Annotation module.
