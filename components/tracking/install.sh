

## We are not going to support GOTURN. See here: https://github.com/opencv/cvat/pull/1003#discussion_r370451389
## and here: https://github.com/opencv/cvat/pull/1003#issuecomment-587735791

# #!/bin/sh
# set -e

# # Install GOTURN model for OpenCV; It is not in a package and has to be downloaded
# cd "$(dirname "$0")"
# echo "Downloading GOTURN model. This can take a while."
# wget -q 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.prototxt'
# wget -q 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.001'
# wget -q 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.002'
# wget -q 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.003'
# wget -q 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.004'
# cat goturn.caffemodel.zip* > goturn.caffemodel.zip
# unzip goturn.caffemodel.zip
# mv goturn.caffemodel goturn.prototxt ../..
# rm goturn.caffemodel.zip*