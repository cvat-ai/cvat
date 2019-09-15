/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported convertPlainArrayToActual, convertToArray, intersection */

/* global
    PolylineModel:false
*/

// Takes a 2d array of canvas points and transforms it to an array of point objects
function convertPlainArrayToActual(arr) {
    let actual = [{ x: arr[0], y: arr[1] }];
    actual = PolylineModel.convertNumberArrayToString(actual);
    actual = window.cvat.translate.points.canvasToActual(actual);
    actual = PolylineModel.convertStringToNumberArray(actual);
    return actual;
}

// converts an array of point objects to a 2D array
function convertToArray(points) {
    const arr = [];
    points.forEach((point) => {
        arr.push([point.x, point.y]);
    });
    return arr;
}


function line(p1, p2) {
    const a = p1[1] - p2[1];
    const b = p2[0] - p1[0];
    const c = b * p1[1] + a * p1[0];
    return [a, b, c];
}

function intersection(p1, p2, p3, p4) {
    const L1 = line(p1, p2);
    const L2 = line(p3, p4);

    const D = L1[0] * L2[1] - L1[1] * L2[0];
    const Dx = L1[2] * L2[1] - L1[1] * L2[2];
    const Dy = L1[0] * L2[2] - L1[2] * L2[0];

    let x = null;
    let y = null;
    if (D !== 0) {
        x = Dx / D;
        y = Dy / D;
        return [x, y];
    }

    return null;
}
