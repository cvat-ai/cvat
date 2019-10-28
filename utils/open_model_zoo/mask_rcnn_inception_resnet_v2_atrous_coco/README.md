# mask_rcnn_inception_resnet_v2_atrous_coco

## Use Case and High-Level Description

Mask R-CNN Inception Resnet V2 Atrous  is trained on COCO dataset and used for object instance segmentation. 
For details, see a [paper](https://arxiv.org/pdf/1703.06870.pdf).

## Specification

| Metric                          | Value                                     |
|---------------------------------|-------------------------------------------|
| Type                            | Instance segmentation                     |
| GFlops                          | 675.314                                   |
| MParams                         | 92.368                                    |
| Source framework                | TensorFlow\*                              |

## Legal Information

[https://raw.githubusercontent.com/tensorflow/models/master/LICENSE]()

## OpenVINO Conversion Notes

In order to convert the code into the openvino format, please see the [following link](https://docs.openvinotoolkit.org/latest/_docs_MO_DG_prepare_model_convert_model_tf_specific_Convert_Object_Detection_API_Models.html#mask_r_cnn_topologies).

The conversion command from the command line prompt will look something like the following.

```shell
$ python /opt/intel/openvino/deployment_tools/model_optimizer/mo_tf.py \
		--input_model /path/to/frozen_inference_graph.pb \
		--tensorflow_use_custom_operations_config /opt/intel/openvino/deployment_tools/model_optimizer/extensions/front/tf/mask_rcnn_support.json \
		--tensorflow_object_detection_api_pipeline_config /path/to/pipeline.config 
```
