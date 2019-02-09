# Re-Identification Application

## About the application

The ReID application uses deep learning model to perform an automatic bbox merging between neighbor frames.
You can use "Merge" and "Split" functionality to edit automatically generated annotation.

## Installation

This application will be installed automatically with the [OpenVINO](https://github.com/opencv/cvat/blob/develop/components/openvino/README.md) component.

## Running

For starting the ReID merge process:

-   Open an annotation job
-   Open the menu
-   Click the "Run ReID Merge" button
-   Click the "Submit" button. Also here you can experiment with values of model threshold or maximum distance.
    -   Model threshold is maximum cosine distance between objects embeddings.
    -   Maximum distance defines a maximum radius that an object can diverge between neightbor frames.
-   The process will be run. You can cancel it in the menu.
