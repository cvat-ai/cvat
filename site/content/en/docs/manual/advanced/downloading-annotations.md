---
title: 'Downloading annotations'
linkTitle: 'Downloading annotations'
weight: 18
---

1. To download the latest annotations, you have to save all changes first.
   Сlick the `Save` button. There is a `Ctrl+S` shortcut to save annotations quickly.
1. After that, сlick the `Menu` button.
1. Press the `Export task dataset` button.

   ![](/images/image028.jpg)

1. Choose the format for exporting the dataset. Exporting is available in several formats:

   - [CVAT for video](/docs/manual/advanced/xml_format/#interpolation)
     choose if the task is created in interpolation mode.
   - [CVAT for images](/docs/manual/advanced/xml_format/#annotation)
     choose if a task is created in annotation mode.

   ![](/images/image029.jpg 'Example XML format')

   - [PASCAL VOC](http://host.robots.ox.ac.uk/pascal/VOC/)
   - [(VOC) Segmentation mask](http://host.robots.ox.ac.uk/pascal/VOC/) —
     archive contains class and instance masks for each frame in the png
     format and a text file with the value of each color.
   - [YOLO](https://pjreddie.com/darknet/yolo/)
   - [COCO](http://cocodataset.org/#format-data)
   - [TFRecord](https://www.tensorflow.org/tutorials/load_data/tfrecord)
   - [MOT](https://motchallenge.net/)
   - [LabelMe 3.0](http://labelme.csail.mit.edu/Release3.0/)
   - [Datumaro](https://github.com/openvinotoolkit/cvat/tree/develop/cvat/apps/dataset_manager/formats/datumaro)
   - [ImageNet](http://www.image-net.org/)
   - [CamVid](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/)
   - [WIDER Face](http://shuoyang1213.me/WIDERFACE/)
   - [VGGFace2](https://github.com/ox-vgg/vgg_face2)
   - [Market-1501](https://www.aitribune.com/dataset/2018051063)
   - [ICDAR13/15](https://rrc.cvc.uab.es/?ch=2)


   For 3D tasks, the following formats are available:
   - [Kitti Raw Format 1.0](http://www.cvlibs.net/datasets/kitti/raw_data.php)
   - Sly Point Cloud Format 1.0  - Supervisely Point Cloud dataset

1. To download images with the dataset tick the `Save images` box

1. (Optional) To name the resulting archive, use the `Custom name` field.

  ![](/images/image225.jpg)
