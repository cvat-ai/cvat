# Semi-Automatic Segmentation with [Deep Extreme Cut](http://www.vision.ee.ethz.ch/~cvlsegmentation/dextr/)

## About the application

The application allows to use deep learning model for semi-automatic semantic and instance segmentation.
You can get a segmentation polygon from four (or more) extreme points of object.
This application uses the pre-trained DEXTR model which has been converted to Inference Engine format.

We are grateful to K.K. Maninis, S. Caelles, J. Pont-Tuset, and L. Van Gool who permitted to use their models in our tool.

## Installation

```bash
# Build image with Deep Extreme Cut application (OpenVINO component is also needed)
docker-compose -f docker-compose.yml -f components/openvino/docker-compose.openvino.yml -f cvat/apps/dextr_segmentation/docker-compose.dextr.yml build
```

## Running
