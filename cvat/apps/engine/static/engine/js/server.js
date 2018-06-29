/* exported serverRequest saveJobOnServer encodeFilePathToURI */
"use strict";

function serverRequest(url, successCallback)
{
    $.ajax({
        url: url,
        dataType: "json",
        success: successCallback,
        error: serverError
    });
}

function saveJobOnServer(jid, data, onsucces, onerror) {
    $.ajax({
        url: "save/annotation/job/" + jid,
        type: "POST",
        data: data,
        success: onsucces,
        error: onerror
    });
}

function encodeFilePathToURI(path) {
    return path.split('/').map(x => encodeURIComponent(x)).join('/');
}

function serverError() {
    let message = 'Server errors was occured. Please contact with research automation team.';
    showOverlay(message);
    throw Error(message);
}
