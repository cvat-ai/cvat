# Object Detection YOLO V3 Python Demo, Async API Performance Showcase

See [these instructions][1] for converting the yolo weights to the OpenVino format.

As of OpenVINO 2019 R3, only tensorflow 1.13 and NetworkX 2.3.
These can be explicitly installed using the following command.

```bash
python3 -m pip install tensorflow==1.13 networkx==2.3
```


Additionally, at the time of writing, the model optimizer required an input shape.

``` bash
python3 mo_tf.py \
    --input_model /path/to/yolo_v3.pb \
    --tensorflow_use_custom_operations_config $MO_ROOT/extensions/front/tf/yolo_v3.json \
    --input_shape [1,416,416,3]
```

[1]: https://docs.openvinotoolkit.org/latest/_docs_MO_DG_prepare_model_convert_model_tf_specific_Convert_YOLO_From_Tensorflow.html
