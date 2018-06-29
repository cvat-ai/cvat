# Tensorflow annotation cvat django-app

#### What is it?
This application allows you automatically to annotate many various objects on images. [Tensorflow object detector](https://github.com/tensorflow/models/tree/master/research/object_detection) work in backend. It needs NVIDIA GPU for convenience using, but you may run it on CPU (just remove tensorflow-gpu python package and install the CPU tensorflow package version).

#### Enable instructions
1. Download the root dir with this app to cvat/apps if need.
2. Add urls for tf annotation in ```urls.py```:
```
urlpatterns += [path('tf_annotation/', include('cvat.apps.tf_annotation.urls'))]
```
3. Enable this application in ```settings/base.py```
```
INSTALLED_APPS += ['cvat.apps.tf_annotation']
```

1. If you want to run CVAT in container:

* Set TF_ANNOTATION argument to "yes" in ```docker-compose.yml```
* Add ```runtime: nvidia``` (if you have nvidia-gpu) to cvat block ([nvidia-docker2](https://github.com/nvidia/nvidia-docker/wiki/Installation-(version-2.0)) must be installed)

5. Else you must download [model](http://download.tensorflow.org/models/object_detection/faster_rcnn_inception_resnet_v2_atrous_coco_11_06_2017.tar.gz), unpack it and set TF_ANNOTATION_MODEL_PATH environment variable to unpacked file ```frozen_inference_graph.pb```.
This variable must be available from cvat runtime environment.
