/* global
    require:false
*/
"use strict";

var cv;
$.getScript('https://unpkg.com/opencv_js_cvat@1.0.1/opencv.js');

function equalizeHist(frame) {
    const imgSrc = new Image();
    imgSrc.src = frame.css('background-image').slice(5, -2);

    const imgRGBA = cv.imread(imgSrc);

    const img = new cv.Mat();
    // There is no COLOR_RGBA2YUV so we do it in two steps.
    cv.cvtColor(imgRGBA, img, cv.COLOR_RGBA2BGR);
    cv.cvtColor(img, img, cv.COLOR_BGR2YUV);

    // Equalize Y component
    const planes = new cv.MatVector();
    cv.split(img, planes);
    cv.equalizeHist(planes.get(0), planes.get(0));

    // Convert back to RGB
    cv.merge(planes, img);
    cv.cvtColor(img, img, cv.COLOR_YUV2RGB);

    const out = document.createElement('canvas');
    cv.imshow(out, img);

    const data = out.toDataURL();
    frame.css('background-image', `url(${data})`);

    imgRGBA.delete();
    img.delete();
    planes.delete();
}
