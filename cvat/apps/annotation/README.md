## Description

The purpose of this application is to add support for multiple annotation formats for CVAT.
It allows to download and upload annotations in different formats and easily add support for new.

## How to add a new annotation dumper/parser

1.  Write a python script that will be executed via exec() function.

    Inside of the script environment 3 variables are available:
    - file_object - python's standard file object returned by open() function and exposing a file-oriented API
    (with methods such as read() or write()) to an underlying resource.
    - annotations - instance of [Annotation](annotation.py#L106) class.
    - dump_format - string with name of requested dump format.
    It may be useful if one dumper script implements more than one format support.

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
1.  Write a data migration to create record in database during CVAT startup.

    Example:
    ```python
    from django.db import migrations
    from django.apps import apps
    import os

    def udpate_builtins(apps, schema_editor):
        AnnotationDumperModel = apps.get_model('annotation', 'AnnotationDumper')
        AnnotationParserModel = apps.get_model('annotation', 'AnnotationParser')

        path_prefix = os.path.join("cvat", "apps", "annotation", "builtin")

        AnnotationDumperModel(
            name="new_format_json",
            display_name="NEW FORMAT JSON",
            extension="json",
            handler_file=os.path.join(path_prefix, "new_format", "dumper.py"),
            owner=None,
        ).save()

    class Migration(migrations.Migration):
    dependencies = [
            ('engine', '0001_initial'),
        ]

        operations = [
            migrations.RunPython(update_builtins),
        ]

    ```
## Ideas for improvements

- Annotation format manager like DL Model manager with which the user can add custom format support by
  writing dumper/paser scripts.
- Often a custom parser/dumper requires additional python packages and it would be useful if CVAT provided some API
  that allows the user to install a python dependencies from their own code without changing the source code.
  Possible solutions: install additional modules via pip call to a separate directory for each Annotation Format
  to reduce version conflicts, etc. Thus, custom code can be run in an extended environment, and core CVAT modules
  should not be affected. As well, this functionality can be useful for Auto Annotation module.
