# SAM2 tracker

This directory contains an implementation of a CVAT auto-annotation function
that tracks masks and polygons using the [Segment Anything Model 2][sam2] (SAM2)
from Meta Research.

[sam2]: https://github.com/facebookresearch/sam2

To use this with CVAT CLI, use the following options:

```
--function-file func.py -p model_id=str:<model_id>
```

where `<model_id>` is one of the [SAM2 model IDs][sam2-hf] from Meta's Hugging Face account,
such as `facebook/sam2.1-hiera-tiny` or `facebook/sam2.1-hiera-large`.

[sam2-hf]: https://huggingface.co/models?search=facebook%2Fsam2

In addition, you can add `-p device=str:<device>` to run the model on a specific PyTorch device,
such as `cuda`. By default, the model will be run on the CPU.

All other parameters set with the `-p` option will be passed directly to the model constructor.
