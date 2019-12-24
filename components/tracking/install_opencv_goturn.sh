#!/bin/sh
cd "$(dirname "$0")"
wget 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.prototxt'
wget 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.001'
wget 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.002'
wget 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.003'
wget 'https://github.com/opencv/opencv_extra/raw/c4219d5eb3105ed8e634278fad312a1a8d2c182d/testdata/tracking/goturn.caffemodel.zip.004'

cat goturn.caffemodel.zip* > goturn.caffemodel.zip
unzip goturn.caffemodel.zip
mv goturn.caffemodel goturn.prototxt ../..
rm goturn.caffemodel.zip*