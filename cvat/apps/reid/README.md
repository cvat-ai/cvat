# Re-Identification Application

## About the application
The ReID application is able to merge bounding boxes into tracks as shown below:

Before                                     |  After                                     |
:-----------------------------------------:|:-------------------------------------------:
<img src="images/before.gif" width="100%"> |  <img src="images/after.gif" width="100%"> |

It perform automatic bbox merging between neighbor frames.

## Installation
This application will be installed automatically with the [OpenVINO](https://github.com/opencv/cvat/blob/develop/components/openvino/README.md) component. 

## Running
For starting the ReID merge process:
  - Open an annotation job

  - Open the menu

  - Click the "Run ReID Merge" button

  - Click the "Submit" button. Also here you can experiment with values of model threshold or maximum distance.

    - Model threshold is maximum cosine distance between objects embeddings.

    - Maximum distance defines a maximum radius that an object can diverge between neightbor frames.  

  - The process will be run. You can cancel it in the menu.
