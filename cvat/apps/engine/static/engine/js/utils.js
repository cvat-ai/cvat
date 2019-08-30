/* exported convertPlainArrayToActual, convertToArray */

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
