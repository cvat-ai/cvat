# Ultralytics YOLO

This is an implementation of a CVAT auto-annotation function that uses models from the YOLO
family, as implemented in the Ultralytics library.

> WARNING: While the function code is provided under the MIT license, the underlying Ultralytics
> library has a different licensing model. Make sure to familiarize yourself with the terms at
> <https://www.ultralytics.com/license> before using this function.

This AA function supports all numbered YOLO models implemented by the Ultralytics library,
starting with YOLOv3. At the time of this writing, the most recent such model was YOLO12;
however, future models should also work, provided that the API remains the same.
Zero-shot models, such as YOLO-World and YOLOE, are not supported.

The AA function supports models solving the following tasks:

- classification
- instance segmentation
- object detection
- oriented object detection
- pose estimation

To use this with CVAT CLI, use the following options:

```
--function-file func.py -p model=str:<model>
```

where `<model>` is the path to a pretrained model file, such as `yolo12n.pt`. If the file does
not exist, but its name matches one of the pretrained models available in the library,
that model will be automatically downloaded and used.

See the documentation at <https://docs.ultralytics.com/models/> for information on available
pretrained models.

This function also supports the following options:

- `-p device=str:<device>` - the PyTorch device, such as `cuda`, on which to run the model.
  By default, `cpu` is used.

- `-p keypoint_names_path=str:<path>` - path to a file with names of keypoints.
  Only valid for pose estimation models.
  By default, the 17 keypoint names from the COCO dataset (`nose`, `left_eye`, `right_eye`, etc.)
  will be used.

  Ultralytics model files don't contain keypoint names, so you will likely need to set
  this option if your pose estimation model was trained on a custom dataset.

  The `<path>` must point to a text file, with one keypoint name per line. Leading and trailing
  whitespace will be ignored, and so will empty lines.
