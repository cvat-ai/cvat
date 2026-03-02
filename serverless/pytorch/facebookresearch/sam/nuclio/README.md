# SAM Serverless deploy markdown

## Tensorrt

1. setup depends

    ```bash
    pip install --no-cache-dir onnx onnxsim onnxscript tensorrt
    ```

2. export tensorrt model

    ```bash
    python3 -m scripts.export_encoder --mode trt --model vit_b --simplify
    ```

   scripts.export_encoder arguments:

    - **mode:**

        what mode type want to export: (onnx, trt)

    - **model:**

       what model want to export: (vit_h, vit_l, vit_b, sam_vit_h, sam_vit_l, sam_vit_b), input those keyword script
       will find model weight file automatically

    - **weights:**

       where path of model files placed, script find at this path.

    - **simplify:**

       reference: https://github.com/daquexian/onnx-simplifier/tree/master?tab=readme-ov-file#demonstration

       enable onnx inference graph simplify or not. (recommend, it will reduce model file size)

3. performance

Test condition: `GPU: RTX-3090`, `CPU: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz`, `pytorch-cu121==2.5.1`,
`tensorrt-cu12==10.6.0`, `onnx==1.20.1`, `onnxsim==0.4.36`

exported onnx model version: `opset_version==18`, `dtype==float32`

|     /      |  pth   |  trt   |
|:----------:|:------:|:------:|
| gpu-memory | ~7000m | ~7000m |
|   speed    | ~420ms | ~250ms |

totally, trt will bring about a **40%** improvement
