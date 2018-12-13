## Custom annotation

### Description

This application will be enabled automatically if OpenVINO component was installed and allows to use custom detection models for preannotation.
Supported frameworks:
* DLDT form OpenVINO toolkit

Application uses OpenCV dnn module with DLDT backed for inference.

### Usage
To annotate task with custom model you need prepare 4 files:
1. **Model config** - a text file contains network configuration. It could be a file with the following extensions:
   * *.xml (DLDT)
1. **Model weights** - a binary file contains trained weights. The following file extensions are expected for models from different frameworks:
   * *.bin (DLDT)
1. **Preprocessing configureation and label map** - simple json file that describes image dimentions and preprocessing options. For more details please view [OpenCV](https://docs.opencv.org/3.4/d6/d0f/group__dnn.html#ga0b7b7c3c530b747ef738178835e1e70f) documentation.
  Example:
    ```json
    {
      "blob_params": {
        "width": 300,
        "height":300,
        "mean": "127.5, 127.5, 127.5",
        "scalefactor": 0.0078431372549,
        "swapRB": false,
        "crop": false
      },
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
1. **Interpretation script** - python scripts that converts output results from net to CVAT format. File must contain function with following signature: `process_detections(detections):`. There detection is list object of dictionaries that represent detections for each frame of task with folloing keys:
  * frame_id - frame number
  * frame_height - frame height
  * frame_width - frame width
  * detections - output blob (See [cv::dnn::Net::forward](https://docs.opencv.org/3.4/db/d30/classcv_1_1dnn_1_1Net.html#a98ed94cb6ef7063d3697259566da310b) for details)
    Example for SSD based network
    ```python
    def process_detections(detections):
      def clip(value):
        return max(min(1.0, value), 0.0)

      boxes = []
      for frame_results in detections:
        frame_height = frame_results['frame_height']
        frame_width = frame_results['frame_width']
        frame_number = frame_results['frame_id']

        for i in range(frame_results['detections'].shape[2]):
          confidence = frame_results['detections'][0, 0, i, 2]
          if confidence < 0.4: continue

          class_id = str(int(frame_results['detections'][0, 0, i, 1]))
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
      return {'boxes': boxes }
    ```
