---
title: 'Export annotations and data from CVAT'
linkTitle: 'Export annotations and data from CVAT'
weight: 20
description: 'List of data export formats formats supported by CVAT.'
---

In CVAT, you have the option to export data in various formats.
The choice of export format depends on the type of annotation as
well as the intended future use of the dataset.

See:

- [Data export formats](#data-export-formats)
- [Exporting dataset in CVAT](#exporting-dataset-in-cvat)
  - [Exporting dataset from Task](#exporting-dataset-from-task)
  - [Exporting dataset from Job](#exporting-dataset-from-job)
- [Data export video tutorial](#data-export-video-tutorial)

## Data export formats

The table below outlines the available formats for data export in CVAT.

<!--lint disable maximum-line-length-->

| Format                                                                                                                      | Type          | Computer Vision Task                                        | Models                                                                                                                                                                                  | Shapes                                                                                          | Attributes           | Video Tracks  |
|-----------------------------------------------------------------------------------------------------------------------------|---------------|-------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------| -------------------- |---------------|
| [CamVid 1.0](format-camvid)                                                                                                 | .txt <br>.png | Semantic <br>Segmentation                                   | U-Net, SegNet, DeepLab, <br>PSPNet, FCN, Mask R-CNN, <br>ICNet, ERFNet, HRNet, <br>V-Net, and others.                                                                                   | Polygons                                                                                        | Not supported        | Not supported |
| [Cityscapes 1.0](format-cityscapes)                                                                                         | .txt<br>.png  | Semantic<br>Segmentation                                    | U-Net, SegNet, DeepLab, <br>PSPNet, FCN, ERFNet, <br>ICNet, Mask R-CNN, HRNet, <br>ENet, and others.                                                                                    | Polygons                                                                                        | Specific attributes  | Not supported |
| [COCO 1.0](format-coco)                                                                                                     | JSON          | Detection, Semantic <br>Segmentation                        | YOLO (You Only Look Once), <br>Faster R-CNN, Mask R-CNN, SSD (Single Shot MultiBox Detector), <br> RetinaNet, EfficientDet, UNet, <br>DeepLabv3+, CenterNet, Cascade R-CNN, and others. | Bounding Boxes, Polygons                                                                        | Specific attributes  | Not supported |
| [COCO Keypoints 1.0](coco-keypoints)                                                                                        | .xml          | Keypoints                                                   | OpenPose, PoseNet, AlphaPose, <br> SPM (Single Person Model), <br>Mask R-CNN with Keypoint Detection:, and others.                                                                      | Skeletons                                                                                       | Specific attributes  | Not supported |
| {{< ilink "/docs/manual/advanced/formats/format-cvat#cvat-for-image-export" "CVAT for images 1.1" >}}                       | .xml          | Any in 2D except for Video Tracking                         | Any model that can decode the format.                                                                                                                                                   | Bounding Boxes, Polygons, <br>Polylines, Points, Cuboids, <br>Skeletons, Ellipses, Masks, Tags. | All attributes       | Not supported |
| {{< ilink "/docs/manual/advanced/formats/format-cvat#cvat-for-videos-export" "CVAT for video 1.1" >}}                       | .xml          | Any in 2D except for Classification                         | Any model that can decode the format.                                                                                                                                                   | Bounding Boxes, Polygons, <br>Polylines, Points, Cuboids, <br>Skeletons, Ellipses, Masks.       | All attributes       | Supported     |
| [Datumaro 1.0](format-datumaro)                                                                                             | JSON          | Any                                                         | Any model that can decode the format. <br> Main format in [Datumaro](https://github.com/openvinotoolkit/datumaro) framework                                                             | Bounding Boxes, Polygons, <br>Polylines, Points, Cuboids, <br>Skeletons, Ellipses, Masks, Tags. | All attributes       | Supported     |
| [ICDAR](format-icdar)<br> Includes ICDAR Recognition 1.0, <br>ICDAR Detection 1.0, <br>and ICDAR Segmentation 1.0 <br>descriptions. | .txt          | Text recognition, <br>Text detection, <br>Text segmentation | EAST: Efficient and Accurate <br>Scene Text Detector, CRNN, Mask TextSpotter, TextSnake, <br>and others.                                                                                | Tag, Bounding Boxes, Polygons                                                                   | Specific attributes  | Not supported |
| [ImageNet 1.0](format-imagenet)                                                                                             | .jpg <br>.txt | Semantic Segmentation, <br>Classification, <br>Detection    | VGG (VGG16, VGG19), Inception, YOLO, Faster R-CNN , U-Net, and others                                                                                                                   | Tags                                                                                            | No attributes        | Not supported |
| [KITTI 1.0](format-kitti)                                                                                                   | .txt <br>.png | Semantic Segmentation, Detection, 3D                        | PointPillars, SECOND, AVOD, YOLO, DeepSORT, PWC-Net, ORB-SLAM, and others.                                                                                                              | Bounding Boxes, Polygons                                                                        | Specific attributes  | Not supported |
| [LabelMe 3.0](format-labelme)                                                                                               | .xml          | Compatibility, <br>Semantic Segmentation                    | U-Net, Mask R-CNN, Fast R-CNN,<br> Faster R-CNN, DeepLab, YOLO, <br>and others.                                                                                                         | Bounding Boxes, Polygons                                                                        | Supported (Polygons) | Not supported |
| [LFW 1.0](format-lfw)                                                                                                       | .txt          | Verification, <br>Face recognition                          | OpenFace, VGGFace & VGGFace2, <br>FaceNet, ArcFace, <br>and others.                                                                                                                     | Tags, Skeletons                                                                                 | Specific attributes  | Not supported |
| [Market-1501 1.0](format-market1501)                                                                                        | .txt          | Re-identification                                           | Triplet Loss Networks, <br>Deep ReID models, and others.                                                                                                                                | Bounding Boxes                                                                                  | Specific attributes  | Not supported |
| [MOT 1.0](format-mot)                                                                                                       | .txt          | Video Tracking, <br>Detection                               | SORT, MOT-Net, IOU Tracker, <br>and others.                                                                                                                                             | Bounding Boxes                                                                                  | Specific attributes  | Supported     |
| [MOTS PNG 1.0](format-mots)                                                                                                 | .png<br>.txt  | Video Tracking, <br>Detection                               | SORT, MOT-Net, IOU Tracker, <br>and others.                                                                                                                                             | Bounding Boxes, Masks                                                                           | Specific attributes  | Supported     |
| [Open Images 1.0](format-openimages)                                                                                        | .csv          | Detection, <br>Classification, <br>Semantic Segmentation    | Faster R-CNN, YOLO, U-Net, <br>CornerNet, and others.                                                                                                                                   | Bounding Boxes, Tags, Polygons                                                                  | Specific attributes  | Not supported |
| [PASCAL VOC 1.0](format-voc)                                                                                                | .xml          | Classification, Detection                                   | Faster R-CNN, SSD, YOLO, <br>AlexNet, and others.                                                                                                                                       | Bounding Boxes, Tags, Polygons                                                                  | Specific attributes  | Not supported |
| [Segmentation Mask 1.0](format-smask)                                                                                       | .txt          | Semantic Segmentation                                       | Faster R-CNN, SSD, YOLO, <br>AlexNet, and others.                                                                                                                                       | Polygons                                                                                        | No attributes        | Not supported |
| [VGGFace2 1.0](format-vggface2)                                                                                             | .csv          | Face recognition                                            | VGGFace, ResNet, Inception, <br> and others.                                                                                                                                            | Bounding Boxes, Points                                                                          | No attributes        | Not supported |
| [WIDER Face 1.0](format-widerface)                                                                                          | .txt          | Detection                                                   | SSD (Single Shot MultiBox Detector), Faster R-CNN, YOLO, <br>and others.                                                                                                                | Bounding Boxes, Tags                                                                            | Specific attributes  | Not supported |
| [YOLO 1.0](format-yolo)                                                                                                     | .txt          | Detection                                                   | YOLOv1, YOLOv2 (YOLO9000), <br>YOLOv3, YOLOv4, and others.                                                                                                                              | Bounding Boxes                                                                                  | No attributes        | Not supported |
| [Ultralytics YOLO Detection 1.0](format-yolo-ultralytics)                                                                   | .txt          | Detection                                                   | YOLOv8                                                                                                                                                                                  | Bounding Boxes                                                                                  | No attributes        | Supported     |
| [Ultralytics YOLO Segmentation 1.0](format-yolo-ultralytics)                                                                            | .txt          | Instance Segmentation                                       | YOLOv8                                                                                                                                                                                  | Polygons, Masks                                                                                 | No attributes        | Supported     |
| [Ultralytics YOLO Pose 1.0](format-yolo-ultralytics)                                                                                    | .txt          | Keypoints                                                   | YOLOv8                                                                                                                                                                                  | Skeletons                                                                                       | No attributes        | Supported     |
| [Ultralytics YOLO Oriented Bounding Boxes 1.0](format-yolo-ultralytics)                                                                 | .txt          | Detection                                                   | YOLOv8                                                                                                                                                                                  | Bounding Boxes                                                                                  | No attributes        | Supported     |
| [Ultralytics YOLO Classification 1.0](format-yolo-ultralytics-classification)                                                           | .jpg          | Classification                                              | YOLOv8                                                                                                                                                                                  | Tags                                                                                            | No attributes        | Not supported |


<!--lint enable maximum-line-length-->

## Exporting dataset in CVAT

### Exporting dataset from Task

To export the dataset from the task, follow these steps:

1. Open Task.
2. Go to **Actions** > **Export task dataset.**
3. Choose the desired format from the list of available options.

4. (Optional) Toggle the **Save images** switch if you
   wish to include images in the export.

   > **Note**: The **Save images** option is a **paid feature**.

   ![Save images option](/images/export_job_as_dataset_dialog.png)

5. Input a name for the resulting `.zip` archive.

6. Click **OK** to initiate the export.

### Exporting dataset from Job

To export a dataset from Job follow these steps:

1. Navigate to **Menu** > **Export job dataset**.

   ![Export dataset](/images/export_job_as_dataset_menu.png)

2. Choose the desired format from the list of available options.

3. (Optional) Toggle the **Save images** switch
   if you wish to include images in the export.

   > **Note**: The **Save images** option is a **paid feature**.

   ![Save images option](/images/export_job_as_dataset_dialog.png)

4. Input a name for the resulting `.zip` archive.

5. Click **OK** to initiate the export.

## Data export video tutorial

For more information on the process, see the following tutorial:

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/gzjVpVV9orE?si=2tiBIqts8nk_byTH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
