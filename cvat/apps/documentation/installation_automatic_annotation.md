### Semi-automatic and Automatic Annotation

> **⚠ WARNING: Do not use `docker-compose up`**
> If you did, make sure all containers are stopped by `docker-compose down`.

- To bring up cvat with auto annotation tool, from cvat root directory, you need to run:

  ```bash
  docker-compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d
  ```

  If you did any changes to the docker-compose files, make sure to add `--build` at the end.

  To stop the containers, simply run:

  ```bash
  docker-compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml down
  ```

- You have to install `nuctl` command line tool to build and deploy serverless
  functions. Download [version 1.5.16](https://github.com/nuclio/nuclio/releases/tag/1.5.16).
  It is important that the version you download matches the version in
  [docker-compose.serverless.yml](/components/serverless/docker-compose.serverless.yml)
  After downloading the nuclio, give it a proper permission and do a softlink

  ```
  sudo chmod +x nuctl-<version>-linux-amd64
  sudo ln -sf $(pwd)/nuctl-<version>-linux-amd64 /usr/local/bin/nuctl
  ```

- Create `cvat` project inside nuclio dashboard where you will deploy new serverless functions and deploy a couple of DL models. Commands below should be run only after CVAT has been installed using `docker-compose` because it runs nuclio dashboard which manages all serverless functions.

  ```bash
  nuctl create project cvat
  ```

  ```bash
  nuctl deploy --project-name cvat \
    --path serverless/openvino/dextr/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local
  ```

  ```bash
  nuctl deploy --project-name cvat \
    --path serverless/openvino/omz/public/yolo-v3-tf/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local
  ```

  **Note:**

  - See [deploy_cpu.sh](/serverless/deploy_cpu.sh) for more examples.

  #### GPU Support

  You will need to install Nvidia Container Toolkit and make sure your docker supports GPU. Follow [Nvidia docker instructions](https://www.tensorflow.org/install/docker#gpu_support).
  Also you will need to add `--resource-limit nvidia.com/gpu=1` to the nuclio deployment command.
  As an example, below will run on the GPU:

  ```bash
  nuctl deploy tf-faster-rcnn-inception-v2-coco-gpu \
    --project-name cvat --path "serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio" --platform local \
    --base-image tensorflow/tensorflow:2.1.1-gpu \
    --desc "Faster RCNN from Tensorflow Object Detection GPU API" \
    --image cvat/tf.faster_rcnn_inception_v2_coco_gpu \
    --resource-limit nvidia.com/gpu=1
  ```

  **Note:**

  - Since the model is loaded during deployment, the number of GPU functions you can deploy will be limited to your GPU memory.

  - See [deploy_gpu.sh](/serverless/deploy_gpu.sh) script for more examples.

####Debugging Nuclio Functions:

- You can open nuclio dashboard at [localhost:8070](http://localhost:8070). Make sure status of your functions are up and running without any error.

- To check for internal server errors, run `docker ps -a` to see the list of containers. Find the container that you are interested, e.g. `nuclio-nuclio-tf-faster-rcnn-inception-v2-coco-gpu`. Then check its logs by

  ```bash
  docker logs <name of your container>
  ```

  e.g.,

  ```bash
  docker logs nuclio-nuclio-tf-faster-rcnn-inception-v2-coco-gpu
  ```

- If you would like to debug a code inside a container, you can use vscode to directly attach to a container [instructions](https://code.visualstudio.com/docs/remote/attach-container). To apply your changes, make sure to restart the container.

  ```bash
  docker restart <name_of_the_container>
  ```

  > **⚠ WARNING:**
  > Do not use nuclio dashboard to stop the container because with any modifications, it rebuilds the container and you will lose your changes.
