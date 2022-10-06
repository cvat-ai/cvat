// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Note: for now, it was simpler to put this color channel logic here
// rather than into actions and reducers.

let prevFileName;
let prevImageData;
let prevColor;

// Make grayscale version of the image data, using the given color channel.
// Copy the pixels from the given channel to the other channels.
// Each pixel has 4 values: [r, g, b, alpha].
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function showColorChannel(data, channel) {
    for (let p = 0; p < data.length; p += 4) {
        if (channel === 'R') {
            // Copy R to G and B.
            data[p + 1] = data[p]; // eslint-disable-line no-param-reassign
            data[p + 2] = data[p]; // eslint-disable-line no-param-reassign
        } else if (channel === 'G') {
            // Copy G to R and B.
            data[p] = data[p + 1]; // eslint-disable-line no-param-reassign
            data[p + 2] = data[p + 1]; // eslint-disable-line no-param-reassign
        } else if (channel === 'B') {
            // Copy B to R and G.
            data[p] = data[p + 2]; // eslint-disable-line no-param-reassign
            data[p + 1] = data[p + 2]; // eslint-disable-line no-param-reassign
        }
    }
}

// Copy the pixel values from the original matrix to the data matrix.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function resetImage(origData, data) {
    for (let p = 0; p < data.length; p += 4) {
        data[p] = origData[p]; // eslint-disable-line no-param-reassign
        data[p + 1] = origData[p + 1]; // eslint-disable-line no-param-reassign
        data[p + 2] = origData[p + 2]; // eslint-disable-line no-param-reassign
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function chooseColor(color) {
    // Get the current file name from the DOM.
    const fileName = document.querySelector('.cvat-player-filename-wrapper span').innerText;

    // Get the image data object from the canvas DOM element.
    const canvas = document.getElementById('cvat_canvas_background');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const { data } = imageData;

    // If we have a new image, then get the image data array.
    const newImage = fileName !== prevFileName;
    if (newImage) {
        prevFileName = fileName;
        prevImageData = Uint8ClampedArray.from(data);
    } else {
        // Put the original image data back into the data array,
        // to prep for selecting a color channel.
        resetImage(prevImageData, data);
    }

    if (color && (newImage || color !== prevColor)) {
        // Replace the other colors with the selected color channel.
        showColorChannel(data, color);
        prevColor = color;
    } else {
        // Toggle off the color channel, to see all the channels again.
        prevColor = '';
    }

    // Redraw the image on the canvas.
    ctx.putImageData(imageData, 0, 0);
}
