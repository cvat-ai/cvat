# Semi-Automatic Segmentation with [Deep Extreme Cut](http://www.vision.ee.ethz.ch/~cvlsegmentation/dextr/)

## About the application

The application allows to use deep learning model for semi-automatic semantic and instance segmentation.
You can get a segmentation polygon from four (or more) extreme points of object.
This application uses the pre-trained DEXTR model which has been converted to Inference Engine format.

We are grateful to K.K. Maninis, S. Caelles, J. Pont-Tuset, and L. Van Gool who permitted using their models in our tool

## Installation

```bash
# Build image with Deep Extreme Cut application (OpenVINO component is also needed)
docker-compose -f docker-compose.yml -f components/openvino/docker-compose.openvino.yml -f cvat/apps/dextr_segmentation/docker-compose.dextr.yml build
```

## Running

1.  Open a job
2.  Select "Auto Segmentation" in the list of shapes
3.  Run the draw mode as usually (by press the "Create Shape" button or by "N" shortcut)
4.  Click four-six (or more if need) extreme points of an object
5.  Close the draw mode (the same way like start it)
6.  Wait a moment and you will receive class agnostic annotation polygon
7.  You can close an annotation request if it is so long (in case if it is queued to rq worker and all workers are busy)
