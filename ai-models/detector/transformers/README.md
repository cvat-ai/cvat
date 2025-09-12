# Hugging Face Transformers

This is an implementation of a CVAT auto-annotation function that uses computer vision models
implemented by the Transformers library: <https://huggingface.co/transformers>.

The AA function supports models solving the following tasks:

- image classification
- image segmentation
- object detection

To use this with CVAT CLI, use the following options:

```
--function-file func.py [...]
```

Any parameters supplied via the `-p` option will be passed directly to the [`pipeline` function][1].

[1]: https://huggingface.co/docs/transformers/en/main_classes/pipelines#transformers.pipeline

You will likely need to pass at least the following options:

- `-p model=str:<model>` - which model to use. `<model>` can be a path or a model identifier
  in Hugging Face Hub (such as `facebook/detr-resnet-50`).

- `-p task=str:<task>` - which task to solve. `<task>` must be one of `image-classification`,
  `image-segmentation`, or `object-detection`. This is usually only needed when loading the model
  from a local path. By default, the task will be determined automatically.

- `-p device=str:<device>` - which device to run the model on, such as `cpu` or `cuda`.
  By default, Transformers will try to automatically select the most appropriate device.

See the Transformers documentation for information on other available options.
