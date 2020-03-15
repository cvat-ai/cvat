## Auto annotation

- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)
- [Testing script](#testing)
- [Examples](#examples)
  - [Person-vehicle-bike-detection-crossroad-0078](#person-vehicle-bike-detection-crossroad-0078-openvino-toolkit)
  - [Landmarks-regression-retail-0009](#landmarks-regression-retail-0009-openvino-toolkit)
  - [Semantic Segmentation](#semantic-segmentation)
- [Available interpretation scripts](#available-interpretation-scripts)

### Description

The application will be enabled automatically if
[OpenVINO&trade; component](../../../components/openvino)
is installed. It allows to use custom models for auto annotation. Only models in
OpenVINO&trade; toolkit format are supported. If you would like to annotate a
task with a custom model please convert it to the intermediate representation
(IR) format via the model optimizer tool. See [OpenVINO documentation](https://software.intel.com/en-us/articles/OpenVINO-InferEngine) for details.

### Installation

See the installation instructions for [the OpenVINO component](../../../components/openvino)

### Usage

To annotate a task with a custom model you need to prepare 4 files:
1. __Model config__ (*.xml) - a text file with network configuration.
1. __Model weights__ (*.bin) - a binary file with trained weights.
1. __Label map__ (*.json) - a simple json file with `label_map` dictionary like
object with string values for label numbers.
  Example:
    ```json
    {
      "label_map": {
        "0": "background",
        "1": "aeroplane",
        "2": "bicycle",
        "3": "bird",
        "4": "boat",
        "5": "bottle",
        "6": "bus",
        "7": "car",
        "8": "cat",
        "9": "chair",
        "10": "cow",
        "11": "diningtable",
        "12": "dog",
        "13": "horse",
        "14": "motorbike",
        "15": "person",
        "16": "pottedplant",
        "17": "sheep",
        "18": "sofa",
        "19": "train",
        "20": "tvmonitor"
      }
    }
    ```
1. __Interpretation script__ (*.py) - a file used to convert net output layer
to a predefined structure which can be processed by CVAT. This code will be run
inside a restricted python's environment, but it's possible to use some
builtin functions like __str, int, float, max, min, range__.

   Also two variables are available in the scope:

   - __detections__ - a list of dictionaries with detections for each frame:
      * __frame_id__ - frame number
      * __frame_height__ - frame height
      * __frame_width__ - frame width
      * __detections__ - output np.ndarray (See [ExecutableNetwork.infer](https://software.intel.com/en-us/articles/OpenVINO-InferEngine#inpage-nav-11-6-3) for details).

   - __results__ - an instance of python class with converted results.
     Following methods should be used to add shapes:
     ```python
     # xtl, ytl, xbr, ybr - expected values are float or int
     # label - expected value is int
     # frame_number - expected value is int
     # attributes - dictionary of attribute_name: attribute_value pairs, for example {"confidence": "0.83"}
     add_box(self, xtl, ytl, xbr, ybr, label, frame_number, attributes=None)

     # points - list of (x, y) pairs of float or int, for example [(57.3, 100), (67, 102.7)]
     # label - expected value is int
     # frame_number - expected value is int
     # attributes - dictionary of attribute_name: attribute_value pairs, for example {"confidence": "0.83"}
     add_points(self, points, label, frame_number, attributes=None)
     add_polygon(self, points, label, frame_number, attributes=None)
     add_polyline(self, points, label, frame_number, attributes=None)
     ```

### Testing script

CVAT comes prepackaged with a small command line helper script to help develop interpretation scripts.

It includes a small user interface which allows users to feed in images and see the results using
the user interfaces provided by OpenCV.

See the script and the documentation in the
[auto_annotation directory](https://github.com/opencv/cvat/tree/develop/utils/auto_annotation).

When using the Auto Annotation runner, it is often helpful to drop into a REPL prompt to interact with the variables 
directly. You can do this using the `interact` method from the `code` module.

```python
# Import the interact method from the `code` module
from code import interact


for frame_results in detections:
  frame_height = frame_results["frame_height"]
  frame_width = frame_results["frame_width"]
  frame_number = frame_results["frame_id"]
  # Unsure what other data members are in the `frame_results`? Use the `interact method!
  interact(local=locals())
```

```bash
$ python cvat/utils/auto_annotation/run_models.py --py /path/to/myfile.py --json /path/to/mapping.json --xml /path/to/inference.xml --bin /path/to/inference.bin
Python 3.6.6 (default, Sep 26 2018, 15:10:10)
[GCC 4.2.1 Compatible Apple LLVM 10.0.0 (clang-1000.10.44.2)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
>>> dir()
['__builtins__', 'frame_results', 'detections', 'frame_number', 'frame_height', 'interact', 'results', 'frame_width']
>>> type(frame_results)
<class 'dict'>
>>> frame_results.keys()
dict_keys(['frame_id', 'frame_height', 'frame_width', 'detections'])
```

When using the `interact` method, make sure you are running using the _testing script_, and ensure that you _remove it_
 before submitting to the server! If you don't remove it from the server, the code runners will hang during execution,
 and you'll have to restart the server to fix them.

Another useful development method is visualizing the results using OpenCV. This will be discussed more in the 
[Semantic Segmentation](#segmentation) section.

### Examples

#### [Person-vehicle-bike-detection-crossroad-0078](https://github.com/opencv/open_model_zoo/blob/2018/intel_models/person-vehicle-bike-detection-crossroad-0078/description/person-vehicle-bike-detection-crossroad-0078.md) (OpenVINO toolkit)

__Links__
- [person-vehicle-bike-detection-crossroad-0078.xml](https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-vehicle-bike-detection-crossroad-0078/FP32/person-vehicle-bike-detection-crossroad-0078.xml)
- [person-vehicle-bike-detection-crossroad-0078.bin](https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/person-vehicle-bike-detection-crossroad-0078/FP32/person-vehicle-bike-detection-crossroad-0078.bin)

__Task labels__: person vehicle non-vehicle

__label_map.json__:
```json
{
"label_map": {
    "1": "person",
    "2": "vehicle",
    "3": "non-vehicle"
    }
}
```
__Interpretation script for SSD based networks__:
```python
def clip(value):
  return max(min(1.0, value), 0.0)

for frame_results in detections:
  frame_height = frame_results["frame_height"]
  frame_width = frame_results["frame_width"]
  frame_number = frame_results["frame_id"]

  for i in range(frame_results["detections"].shape[2]):
    confidence = frame_results["detections"][0, 0, i, 2]
    if confidence < 0.5:
      continue

    results.add_box(
      xtl=clip(frame_results["detections"][0, 0, i, 3]) * frame_width,
      ytl=clip(frame_results["detections"][0, 0, i, 4]) * frame_height,
      xbr=clip(frame_results["detections"][0, 0, i, 5]) * frame_width,
      ybr=clip(frame_results["detections"][0, 0, i, 6]) * frame_height,
      label=int(frame_results["detections"][0, 0, i, 1]),
      frame_number=frame_number,
      attributes={
        "confidence": "{:.2f}".format(confidence),
      },
    )
```

#### [Landmarks-regression-retail-0009](https://github.com/opencv/open_model_zoo/blob/2018/intel_models/landmarks-regression-retail-0009/description/landmarks-regression-retail-0009.md) (OpenVINO toolkit)

__Links__
- [landmarks-regression-retail-0009.xml](https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/landmarks-regression-retail-0009/FP32/landmarks-regression-retail-0009.xml)
- [landmarks-regression-retail-0009.bin](https://download.01.org/openvinotoolkit/2018_R5/open_model_zoo/landmarks-regression-retail-0009/FP32/landmarks-regression-retail-0009.bin)

__Task labels__: left_eye right_eye tip_of_nose left_lip_corner right_lip_corner

__label_map.json__:
```json
{
  "label_map": {
      "0": "left_eye",
      "1": "right_eye",
      "2": "tip_of_nose",
      "3": "left_lip_corner",
      "4": "right_lip_corner"
  }
}
```
__Interpretation script__:
```python
def clip(value):
  return max(min(1.0, value), 0.0)

for frame_results in detections:
  frame_height = frame_results["frame_height"]
  frame_width = frame_results["frame_width"]
  frame_number = frame_results["frame_id"]

  for i in range(0, frame_results["detections"].shape[1], 2):
      x = frame_results["detections"][0, i, 0, 0]
      y = frame_results["detections"][0, i + 1, 0, 0]

      results.add_points(
        points=[(clip(x) * frame_width, clip(y) * frame_height)],
        label=i // 2, # see label map and model output specification,
        frame_number=frame_number,
      )
```

#### Semantic Segmentation

__Links__
- [masck_rcnn_resnet50_atrous_coco][1]  (OpenvVINO toolkit)
- [CVAT Implemenation][2]

__label_map.json__:
```json
{
"label_map": {
        "1": "person",
        "2": "bicycle",
        "3": "car",
    }
}
```

Note that the above labels are not all the labels in the model! See [here](https://github.com/opencv/cvat/blob/develop/utils/open_model_zoo/mask_rcnn_inception_resnet_v2_atrous_coco/mapping.json).

**Interpretation script for a semantic segmentation network**:
```python
import numpy as np
import cv2
from skimage.measure import approximate_polygon, find_contours


for frame_results in detections:
    frame_height = frame_results['frame_height']
    frame_width = frame_results['frame_width']
    frame_number = frame_results['frame_id']
    detection = frame_results['detections']

	# The keys for the below two members will vary based on the model
    masks = frame_results['masks']
    boxes = frame_results['reshape_do_2d']

	for box_index, box in enumerate(boxes):
		# Again, these indexes specific to this model
		class_label = int(box[1])
		box_class_probability = box[2]
		
		if box_class_probability > 0.2:
			xmin = box[3] * frame_width
			ymin = box[4] * frame_height
			xmax = box[5] * frame_width
			ymax = box[6] * frame_width

			box_width = int(xmax - xmin)
			box_height =  int(ymin - ymax)

			# use the box index and class label index to find the appropriate mask
			# note that we need to convert the class label to a zero indexed array by subtracting `1`
			class_mask = masks[box_index][class_label - 1]

			# Class mask is a 33 x 33 matrix
			# resize it to the bounding box
			resized_mask = cv2.resize(class_mask, dsize(box_height, box_width), interpolation=cv2.INTER_CUBIC)

			# Each pixel is a probability, select every pixel above the probability threshold, 0.5
			# Do this using the boolean `>` method
			boolean_mask = (resized_mask > 0.5)

			# Convert the boolean values to uint8 
			uint8_mask = boolean_mask.astype(np.uint8) * 255

			# Change the x and y coordinates into integers
			xmin = int(round(xmin))
			ymin = int(round(ymin))
			xmax = xmin + box_width
			ymax = ymin + box_height

			# Create an empty blank frame, so that we can get the mask polygon in frame coordinates
			mask_frame = np.zeros((frame_height, frame_width), dtype=np.uint8)

			# Put the uint8_mask on the mask frame using the integer coordinates
			mask_frame[xmin:xmax, ymin:ymax] = uint8_mask

			mask_probability_threshold = 0.5
			# find the contours
			contours = find_contours(mask_frame, mask_probability_threshold)
			# every bounding box should only have a single contour
			contour = contours[0]
			contour = np.flip(contour, axis=1)

			# reduce the precision on the polygon
			polygon_mask = approximate_polygon(contour, tolerance=2.5)
			polygon_mask = polygon_mask.tolist()

			results.add_polygon(polygon_mask, class_label, frame_number)
```

Note that it is sometimes hard to see or understand what is happening in a script. 
Use of the computer vision module can help you visualize what is happening.

```python
import cv2


for frame_results in detections:
    frame_height = frame_results['frame_height']
    frame_width = frame_results['frame_width']
    detection = frame_results['detections']

    masks = frame_results['masks']
    boxes = frame_results['reshape_do_2d']

	for box_index, box in enumerate(boxes):
		class_label = int(box[1])
		box_class_probability = box[2]
		
		if box_class_probability > 0.2:
			xmin = box[3] * frame_width
			ymin = box[4] * frame_height
			xmax = box[5] * frame_width
			ymax = box[6] * frame_width

			box_width = int(xmax - xmin)
			box_height =  int(ymin - ymax)

			class_mask = masks[box_index][class_label - 1]
			# Visualize the class mask!
			cv2.imshow('class mask', class_mask)
			# wait until user presses keys
			cv2.waitKeys()

			boolean_mask = (resized_mask > 0.5)
			uint8_mask = boolean_mask.astype(np.uint8) * 255

			# Visualize the class mask after it's been resized!
			cv2.imshow('class mask', uint8_mask)
			cv2.waitKeys()
```

Note that you should _only_ use the above commands while running the [Auto Annotation Model Runner][3].
Running on the server will likely require a server restart to fix. 
The method `cv2.destroyAllWindows()` or `cv2.destroyWindow('your-name-here')` might be required depending on your
 implementation.

### Available interpretation scripts

CVAT comes prepackaged with several out of the box interpretation scripts.
See them in the [open model zoo directory](https://github.com/opencv/cvat/tree/develop/utils/open_model_zoo)

[1]: https://github.com/opencv/open_model_zoo/blob/master/models/public/mask_rcnn_resnet50_atrous_coco/model.yml
[2]: https://github.com/opencv/cvat/tree/develop/utils/open_model_zoo/mask_rcnn_inception_resnet_v2_atrous_coco
[3]: https://github.com/opencv/cvat/tree/develop/utils/auto_annotation
