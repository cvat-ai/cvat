/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported serverRequest saveJobRequest encodeFilePathToURI */

/* global
    showOverlay:false
*/

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

function saveJobRequest(jid, data, success, error) {
    $.ajax({
        url: `/api/v1/jobs/${jid}/annotations`,
        type: 'PUT',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: success,
        error: error,
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
