---
title: 'Projects'
linkTitle: 'Projects'
weight: 3
description: 'Creating and exporting projects in CVAT.'
---

### Create project

At CVAT, you can create a project containing tasks of the same type.
All tasks related to the project will inherit a list of labels.

To create a project, go to the projects section by clicking on the `Projects` item in the top menu. 
On the projects page, you can see a list of projects, use a search, or create a new project by clicking `Create New Project`.

![](/images/image190.jpg)

You can change: the name of the project, the list of labels
(which will be used for tasks created as parts of this project) and a link to the issue.

![](/images/image191.jpg)

Once created, the project will appear on the projects page. To open a project, just click on it.

![](/images/image192_mapillary_vistas.jpg)

Here you can do the following:

1. Change the project's title.
1. Open the `Actions` menu.
1. Change issue tracker or open issue tracker if it is specified.
1. Change labels.
   You can add new labels or add attributes for the existing labels in the Raw mode or the Constructor mode. 
   You can also change the color for different labels. By clicking `Copy` you can copy the labels to the clipboard.
1. Assigned to — is used to assign a project to a person.
   Start typing an assignee's name and/or choose the right person out of the dropdown list.
1. `Tasks` — is a list of all tasks for a particular project.

It is possible to choose a subset for tasks in the project. Available options are `Train`, `Test` and `Validation`.

You can remove the project and all related tasks through the Action menu.

### Export project

It is possible to download an entire project instead of exporting individual tasks.
To export a project, do the following:

1. Open the `Actions` menu.
1. Press the `Export project dataset` button.
1. In the pop-up menu choose the format for exporting the project. Exporting is available in several formats:
   - [CVAT for video](/docs/manual/advanced/xml_format/#interpolation)
   - [CVAT for images](/docs/manual/advanced/xml_format/#annotation)
   - [PASCAL VOC](http://host.robots.ox.ac.uk/pascal/VOC/)
   - [(VOC) Segmentation mask](http://host.robots.ox.ac.uk/pascal/VOC/)
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

1. To download images with the dataset, tick the `Save images` box.
1. (Optional) To name the resulting archive, use the `Custom name` field.
