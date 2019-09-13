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
        1. display_name - **unique** string used as ID for dumpers and loaders.
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

    Inside of the script environment 2 variables are available:
    - **file_object** - python's standard file object returned by open() function and exposing a file-oriented API
    (with methods such as read() or write()) to an underlying resource.
    - **annotations** - instance of [Annotation](annotation.py#L106) class.

    Annotation class expose API and some additional pre-defined types that allow to get/add shapes inside
    a loader/dumper code.

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
    Pseudocode for a loader code
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
    Full examples can be found in corrseponding *.py files (cvat.py, coco.py, yolo.py, etc.).
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

## Format specifications

### CVAT
This is native CVAT annotation format.
[Detailed format description](cvat/apps/documentation/xml_format.md)

##### CVAT XML for images
downloaded file: Single unpacked XML
supported shapes - Rectangles, Polygons, Polylines, Points

##### CVAT XML for videos
downloaded file: Single unpacked XML
supported shapes - Rectangles, Polygons, Polylines, Points

#### CVAT XML Loader
uploaded file: Single unpacked XML
supported shapes - Rectangles, Polygons, Polylines, Points


### [Pascal VOC](http://host.robots.ox.ac.uk/pascal/VOC/)

#### Dumper description
- downloaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── frame000001.xml
  ├── frame000002.xml
  ├── frame000003.xml
  └── ...
  ```
  Each *.xml file contains annotations for a frame with the same name as annotation file. Detailed structure specification of the *.xml file can be found [here](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/devkit_doc.pdf)
- supported shapes - Rectangles
- additional comments: If you plan to use 'truncated' and 'difficult' attributes please add to CVAT labels attributes the corresponding items:
  `~checkbox=difficult:false ~checkbox=truncated:false`

#### Loader description
- uploaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── frame000001.xml
  ├── frame000002.xml
  ├── frame000003.xml
  └── ...
  ```
  Each *.xml file contains annotations for a frame with the same name as annotation file. Note: it should be possible to match the CVAT frame(imagename) and image filename from the annotation *.xml file(tag filename, e.g. `<filename>2008_004457.jpg</filename>`). There are 2 options:
  1. full match between image name and filename form annotation *.xml file (in case of a task was created from images or archive of images).
  2. match by frame number (if CVAT cannot match by name). If filename tag contains a number CVAT will interpret it as frame number.

- supported shapes: Rectangles
- limitations: Support of Pascal VOC object detection format
- additional comments: the CVAT task should be created with the full label set that may be in the annotation files

#### How to create a task from Pascal VOC dataset
1. Download the Pascal Voc dataset
1. Create the CVAT task with the following labels:
   ```
   aeroplane bicycle bird boat bottle bus car cat chair cow diningtable dog horse motorbike person pottedplant sheep sofa train tvmonitor
   ```
   You can add `~checkbox=difficult:false ~checkbox=truncated:false` attributes if you want to use it.

   Select interesting image files (See [Creating an annotation task](cvat/apps/documentation/user_guide.md#creating-an-annotation-task) guide for details)
1. zip the corresponding annotation files
1. click `Upload annotation` button, choose `Pascal VOC ZIP 1.0` and select the *.zip file with annotations from previous step. It may take some time.

### [YOLO](https://pjreddie.com/darknet/yolo/)
#### Dumper description
- downloaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── frame000001.txt
  ├── frame000002.txt
  ├── ...
  └── obj.names
  ```
  Each `*.txt` file contains annotations for a frame with the same name as annotation file. Short description of  `*.txt` file structure: each line describes label and bounding box in the following format `label_id cx cy w h`.
  `obj.names` contains the ordered list of label names.
- supported shapes - Rectangles

#### Loader description
- uploaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── frame000001.txt
  ├── frame000002.txt
  ├── frame000003.txt
  ├── ...
  └──obj.names
  ```
  Each `*.txt` file contains annotations for a frame with the same name as annotation file. Note: it should be possible to match the CVAT frame(imagename) and annotation filename. There are 2 options:
  1. full match between image name and filename form annotation `*.txt` file (in case of a task was created from images or archive of images).
  2. match by frame number (if CVAT cannot match by name). If name of the *.txt annotation file contains a number CVAT will interpret it as frame number.

- supported shapes: Rectangles
- additional comments: the CVAT task should be created with the full label set that may be in the annotation files

### [MS COCO Object Detection](http://cocodataset.org/#format-data)
#### Dumper description
- downloaded file: single unpacked `json`. Detailed description of the MS COCO format can be found [here](http://cocodataset.org/#format-data)
- supported shapes - Polygons, Rectangles (interpreted as polygons)

#### Loader description
- uploaded file: single unpacked `*.json`.
- supported shapes: Polygons
- additional comments: the CVAT task should be created with the full label set that may be in the annotation files

#### How to create a task from PMS COCO dataset
1. Download the [MS COCO dataset](http://cocodataset.org/#download). For example [2017 Val images](http://images.cocodataset.org/zips/val2017.zip) and [2017 Train/Val annotations](http://images.cocodataset.org/annotations/annotations_trainval2017.zip).
1. Create a CVAT task with the following labels:
   ```
   "person" "bicycle" "car" "motorcycle" "airplane" "bus" "train" "truck" "boat" "traffic light" "fire hydrant" "stop sign" "parking meter" "bench" "bird" "cat" "dog" "horse" "sheep" "cow" "elephant" "bear" "zebra" "giraffe" "backpack" "umbrella" "handbag" "tie" "suitcase" "frisbee" "skis" "snowboard" "sports ball" "kite" "baseball bat" "baseball glove" "skateboard" "surfboard" "tennis racket" "bottle" "wine glass" "cup" "fork" "knife" "spoon" "bowl" "banana" "apple" "sandwich" "orange" "broccoli" "carrot" "hot dog" "pizza" "donut" "cake" "chair" "couch" "potted plant" "bed" "dining table" "toilet" "tv" "laptop" "mouse" "remote" "keyboard" "cell phone" "microwave" "oven" "toaster" "sink" "refrigerator" "book" "clock" "vase" "scissors" "teddy bear" "hair drier" "toothbrush"
   ```

   Select val2017.zip as data (See [Creating an annotation task](cvat/apps/documentation/user_guide.md#creating-an-annotation-task) guide for details)
1. unpack annotations_trainval2017.zip
1. click `Upload annotation` button, choose `COCO JSON 1.0` and select `instances_val2017.json.json` annotation file. It may take some time.

### [TFRecord](https://www.tensorflow.org/tutorials/load_data/tf_records)
TFRecord is a very flexible format, but we try to correspond the format that used in [TF object detection](https://github.com/tensorflow/models/tree/master/research/object_detection) with minimal modifications.
Used feature description:
```
image_feature_description = {
    'image/filename': tf.io.FixedLenFeature([], tf.string),
    'image/source_id': tf.io.FixedLenFeature([], tf.int64),
    'image/height': tf.io.FixedLenFeature([], tf.int64),
    'image/width': tf.io.FixedLenFeature([], tf.int64),
    # Object boxes and classes.
    'image/object/bbox/xmin': tf.io.VarLenFeature(tf.float32),
    'image/object/bbox/xmax': tf.io.VarLenFeature(tf.float32),
    'image/object/bbox/ymin': tf.io.VarLenFeature(tf.float32),
    'image/object/bbox/ymax': tf.io.VarLenFeature(tf.float32),
    'image/object/class/label': tf.io.VarLenFeature(tf.int64),
    'image/object/class/text': tf.io.VarLenFeature(tf.string),
}
```
#### Dumper description
- downloaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── task2.tfrecord
  └── label_map.pbtxt
  ```
- supported shapes - Rectangles

#### Loader description
- uploaded file: a zip archive with following structure:
  ```
  taskname.zip
  └── task2.tfrecord
  ```
- supported shapes: Rectangles
- additional comments: the CVAT task should be created with the full label set that may be in the annotation files

### PNG mask
#### Dumper description
- downloaded file: a zip archive with following structure:
  ```
  taskname.zip
  ├── frame000001.png
  ├── frame000002.png
  ├── frame000003.png
  ├── ...
  └── colormap.txt
  ```
  Mask is a png image with several (RGB) channels where each pixel has own color which corresponds to a label. Color generation correspond to the Pascal VOC color generation [algorithm](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/htmldoc/devkit_doc.html#sec:voclabelcolormap). (0, 0, 0) is used for background.
  colormap.txt file contains the values of used colors in RGB format.
- supported shapes - Rectangles, Polygons

#### Loader description
Not supported
