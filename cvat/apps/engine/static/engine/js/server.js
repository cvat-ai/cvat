/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported serverRequest saveJobRequest encodeFilePathToURI */
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
        url: "save/annotation/job/" + jid,
        type: "POST",
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        success: success,
        error: error,
        processData: false,
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
