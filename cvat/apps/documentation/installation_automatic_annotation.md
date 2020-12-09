
### Semi-automatic and automatic annotation

- To bring up cvat with auto annotation tool, **do not use** `docker-compose up`.If you did, first make sure all containers are stopped `docker-compose down`


  From cvat root directory, you need to run:
  ```bash
  docker-compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d
  ```
  If you did any changes to the docker-compose files, make sure to add `--build` at the end.

  To stop the containers, simply run:

  ```bash
  docker-compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml down
  ```


- You have to install `nuctl` command line tool to build and deploy serverless
  functions. Download [version 1.5.8](https://github.com/nuclio/nuclio/releases).
  It is important that the version you download matches the version in
  [docker-compose.serverless.yml](/components/serverless/docker-compose.serverless.yml)
  After downloading the nuclio, give it a proper permission and do a softlink
  ```
  sudo chmod +x nuctl-<version>-linux-amd64
  sudo ln -sf $(pwd)/nuctl-<version>-linux-amd64 /usr/local/bin/nuctl
  ```

- Create `cvat` project inside nuclio dashboard where you will deploy new
  serverless functions and deploy a couple of DL models. Commands below should
  be run only after CVAT has been installed using docker-compose because it
  runs nuclio dashboard which manages all serverless functions.

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


  If your function is running on GPU, you should add `--resource-limit nvidia.com/gpu=1` to the above command or, alternatively, add gpu resources dircetly into the function.yaml see [tensorflow-fast-rcnn-gpu](../../../serverless/tensorflow/
  faster_rcnn_inception_v2_coco_gpu/nuclio/function.yaml)

    - Note: see [deploy.sh](/serverless/deploy.sh) script for more examples.

####Debugging:

- You can open nuclio dashboard at [localhost:8070](http://localhost:8070). Make sure status of your functions are up and running without any error.


- To check for internal server errors, run `docker ps -a` to see the list of containers. Find the container that you are interested, e.g. `nuclio-nuclio-tf-faster-rcnn-inception-v2-coco-gpu`. Then check its logs by

  ```bash
  docker logs <name of your container>
  ```
  e.g.,

  ```bash
  docker logs nuclio-nuclio-tf-faster-rcnn-inception-v2-coco-gpu
  ```


- If you would like to debug a code inside a container, you can use vscode to directly attach to a container [instructions](https://code.visualstudio.com/docs/remote/attach-container). To apply changes, makse sure to restart the container.
  ```bash
  docker stop <name of the container>
  ```
  and then
  ```bash
  docker start <name of the container>
  ```
  Do not use nuclio dashboard to stop the container since with any change, it rebuilds the container and you'll lose your changes.