## Auto annotation

### Description

This application will be enabled automatically if OpenVINO&trade; component is installed. It allows to use custom models for preannotation.
Supported only DLDT framework from OpenVINO&trade; toolkit. If you woold like to annotate task with custom model please convert it to the
intermediate representation (IR) format via model optimizer tool.
See [OpenVINO documentation](https://software.intel.com/en-us/articles/OpenVINO-InferEngine) for details.


### Usage
To annotate task with a custom model you need prepare 4 files:
1. **Model config** - a text file that contains network configuration. The following file extension is expected:
   * *.xml
1. **Model weights** - a binary file that contains trained weights. The following file extension is expected:
   * *.bin
1. **Label map** - simple json file that contains the `label_map` dictionary like object with string values for label numbers.
Please note values in `label_map` should be exactly equal to the labels wich task was created, otherwise it will be ignored.
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
1. **Interpretation script** - python file that used to convert output results from net to CVAT format. This code running inside restricted environment.
List of builtins functions that available to use:
* **str**
* **int**
* **float**
* **max**
* **min**
* **range**

Also two variables are available in scope:
* **detections** list with detection results(see description below)
* **results** dictionary where convertation results shoud be added (see examples below for details)

`detection` is a python's list of dictionaries that represent detections for each frame of task with folloing keys:
   * frame_id - frame number
   * frame_height - frame height
   * frame_width - frame width
   * detections - output np.ndarray (See [ExecutableNetwork.infer](https://software.intel.com/en-us/articles/OpenVINO-InferEngine#inpage-nav-11-6-3) for details).

`results` is dictionary with structure:
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

    Example for SSD based network:
    ```python
    def process_results(detections, results):
    def clip(value):
        return max(min(1.0, value), 0.0)

    boxes = results['boxes']

    for frame_results in detections:
        frame_height = frame_results['frame_height']
        frame_width = frame_results['frame_width']
        frame_number = frame_results['frame_id']

        for i in range(frame_results['detections'].shape[2]):
            confidence = frame_results['detections'][0, 0, i, 2]
            if confidence < 0.5: continue
            class_id = int(frame_results['detections'][0, 0, i, 1])
            xtl = '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 3]) * frame_width)
            ytl = '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 4]) * frame_height)
            xbr = '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 5]) * frame_width)
            ybr = '{:.2f}'.format(clip(frame_results['detections'][0, 0, i, 6]) * frame_height)

            boxes.append({
                'label': class_id,
                'frame': frame_number,
                'xtl': xtl,
                'ytl': ytl,
                'xbr': xbr,
                'ybr': ybr,
                'attributes': {
                    'confidence': '{:.2f}'.format(confidence),
                }
            })

    process_results(detections, results)
    ```
