## Description
The purpose of this application is to add support for multiple annotation formats for CVAT.
It allows to download and upload annotations in different formats and easily add support for new.

## How to add a new annotation dumper/parser
1. Write specific py script that will be executed via python exec. Inside script environment available 2 globals variable with wich you can interact with CVAT.
    - file_object - python's standard file object returned by open() function and exposing a file-oriented API (with methods such as read() or write()) to an underlying resource.
    - annotations - instance of [Annotation](annotation.py#L104) class.

    Annotation class expose API and some additonal pre defined types that allow to get/add shapes inside a parser/dumper code.

    Short description of the public methods:
    - Annotation.shapes - property, returns a list of Annotation.Frame objects
    - Annotation.meta - property, returns dictionary with meta information for the task, for example - video source name, number of frames, number of jobs, etc
    - Annotation.add_tag(tag): not implemented
    - Annotation.add_shape(shape): shape should be a instanse of the Annotation.Shape class
    - Annotation.add_track(track): track should be a instanse of the Annotation.Track class
    - Annotation.Attribute = namedtuple('Attribute', 'name, value')
      - name - String, name of the attribute
      - value - String, value of the attribute

    - Annotation.Shape = namedtuple('Shape', 'type, points, occluded, attributes, label, outside, keyframe, z_order, group, track_id, frame')

      Annotation.Shape.\_\_new\_\_.\_\_defaults\_\_ = (None, False, False, 0, 0, None, None)
      - type - str, one of "rectangle", "polygon", "polyline", "points"
      - points - list of float
      - occluded - bool
      - attributes - list of Annotation.Attribute
      - label - str
      - outside - bool
      - keyframe - bool
      - z_order - int
      - group - int
      - track_id - int
      - frame - int
    - Annotation.Track = namedtuple('Track', 'label, group, shapes')
      - label - str
      - group - int
      - shapes - list of Annotation.Shape
    - Annotation.Frame = namedtuple('Frame', 'frame, name, width, height, shapes')
      - frame - int
      - name - str
      - width - int
      - height - int
      - shapes - list of Annotation.Shape

      Pseudocode for a dumper code
      ```python
      ...
      # dump meta info if neccessary
      ...

      # iterate over all frames
      for frame_annotation in annotations:
          # get frame info
          image_name = frame_annotation.name
          image_width = frame_annotation.width
          image_height = frame_annotation.height

          # iterate over all shapes on the frame
          for shape in frame_annotation.shapes:
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
          shape = annotations.Shape(
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

1. Write a data migration to create record in database during CVAT startup.

    Example:
    ```python
    import cvat.apps.engine.models
    from django.conf import settings
    import django.core.files.storage
    from django.db import migrations, models
    import django.db.models.deletion
    import os

    def udpate_builtins(apps, schema_editor):
        AnnoDumperModel = apps.get_model('annotation', 'AnnoDumper')
        AnnoParserModel = apps.get_model('annotation', 'AnnoParser')

        path_prefix = ""
        if "development" == os.environ.get("DJANGO_CONFIGURATION", "development"):
            path_prefix = os.path.join("..", "cvat", "apps", "annotation")

        AnnoDumperModel(
            name="new_format_name",
            file_extension="json",
            handler_file=os.path.join(path_prefix, "builtin", "cvat", "dumper.py"),
            owner=None,
        ).save()

        AnnoParserModel(
            name="new_format_name",
            handler_file=os.path.join(path_prefix, "builtin", "cvat", "parser.py"),
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
