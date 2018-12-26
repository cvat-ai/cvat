## Auto annotation

### Description

The application will be enabled automatically if OpenVINO&trade; component is
installed. It allows to use custom models for auto annotation. Only models in
OpenVINO&trade; toolkit format are supported. If you would like to annotate a
task with a custom model please convert it to the intermediate representation
(IR) format via the model optimizer tool. See [OpenVINO documentation](https://software.intel.com/en-us/articles/OpenVINO-InferEngine) for details.

### Usage

To annotate a task with a custom model you need to prepare 4 files:
1. __Model config__ (*.xml) - a text file with network configuration.
1. __Model weights__ (*.bin) - a binary file with trained weights.
1. __Label map__ (*.json) - a simple json file with `label_map` dictionary like
object with string values for label numbers.

Values in `label_map` should be exactly equal to labels for the annotation task,
otherwise objects with mismatched labels will be ignored.
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

   - **detections** - a list of dictionaries with detections for each frame:
      * __frame_id__ - frame number
      * __frame_height__ - frame height
      * __frame_width__ - frame width
      * __detections__ - output np.ndarray (See [ExecutableNetwork.infer](https://software.intel.com/en-us/articles/OpenVINO-InferEngine#inpage-nav-11-6-3) for details).

   - **results** a dictionary with converted results, it has the following structure:
     ```python
      {
        "boxes": [],
        "polygons": [],
        "polylines": [],
        "points": [],
        "box_paths": [],
        "polygon_paths": [],
        "polyline_paths": [],
        "points_paths": [],
      }
      ```


### Examples:

#### [Person-vehicle-bike-detection-crossroad-0078](https://github.com/opencv/open_model_zoo/blob/2018/intel_models/person-vehicle-bike-detection-crossroad-0078/description/person-vehicle-bike-detection-crossroad-0078.md)(OpenVINO toolkit):

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

boxes = results['boxes']

for frame_results in detections:
    frame_height = frame_results['frame_height']
    frame_width = frame_results['frame_width']
    frame_number = frame_results['frame_id']

    for i in range(frame_results['detections'].shape[2]):
        confidence = frame_results['detections'][0, 0, i, 2]
        if confidence < 0.5:
            continue

        boxes.append({
            'label': int(frame_results['detections'][0, 0, i, 1]),
            'frame': frame_number,
            'xtl': '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 3]) * frame_width),
            'ytl': '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 4]) * frame_height),
            'xbr': '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 5]) * frame_width),
            'ybr': '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 6]) * frame_height),
            'attributes': {
                'confidence': '{:.2f}'.format(confidence),
            }
        })
```


#### [Landmarks-regression-retail-0009](https://github.com/opencv/open_model_zoo/blob/2018/intel_models/landmarks-regression-retail-0009/description/landmarks-regression-retail-0009.md)(OpenVINO toolkit):

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

points = results['points']

for frame_results in detections:
  frame_height = frame_results['frame_height']
  frame_width = frame_results['frame_width']
  frame_number = frame_results['frame_id']

  for i in range(0, frame_results['detections'].shape[1], 2):
      x = frame_results['detections'][0, i, 0, 0]
      y = frame_results['detections'][0, i + 1, 0, 0]

      points.append({
          'label': i // 2, # see label map and model output specification
          'frame': frame_number,
          'points': "{},{}".format(clip(x) * frame_width, clip(y) * frame_height)
      })
```
