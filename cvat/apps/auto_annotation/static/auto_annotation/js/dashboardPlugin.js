/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
*/

"use strict";

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];

window.cvat.auto_annotation = {
    requests: {
        update: function(data, success, error, progress, modelId) {
            let url = "";
            if (typeof(modelId) === "undefined") {
                url = "/auto-annotation/create";
            }
            else {
                url = "/auto-annotation/update/" + modelId;
            }

            $.ajax({
                url: url,
                type: "POST",
                data: data,
                contentType: false,
                processData: false,
                success: (data) => {
                    window.cvat.auto_annotation.requests.check(data.id, success, error, progress);
                },
                error: (data) => {
                    if (error) {
                        let message = `Creating request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        start: function(modelId, data, success, error, progress) {
            $.ajax({
                url: "/auto/annotation/start/" + modelId,
                type: "POST",
                data: data,
                contentType: "application/json",
                success: (data) => {
                    window.cvat.auto_annotation.requests.check(data.id, success, error, progress);
                },
                error: (data) => {
                    if (error) {
                        let message = `Starting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        delete: function(modelId, success, error) {
            $.ajax({
                url: "auto-annotation/delete/" + modelId,
                type: "DELETE",
                success: success,
                error: () => {
                    if (error) {
                        let message = `Deleting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        check: function(workerId, success, progress, error) {
            $.ajax({
                url: "auto-annotation/check/" + workerId,
                type: "GET",
                success: (data) => {
                    let checkCallback = function() {
                        if (["finished", "failed", "unknown"].indexOf(data.status) != -1) {
                            if (data.status === "failed" && error) {
                                let message = `Checking request has returned the "${data.status}" status. Message: ${data.error}`;
                                error(message);
                            }
                            else if (data.status === "unknown" && error) {
                                let message = `Checking request has returned the "${data.status}" status.`;
                                error(message);
                            }
                            else if (data.status === "finished") {
                                success();
                            }
                        }
                        else {
                            setTimeout(checkCallback, 1000);
                        }

                        if (data.progress && progress) {
                            progress(data.progress);
                        }
                    }

                    setTimeout(checkCallback, 1000);
                },
                error: (data) => {
                    if (error) {
                        let message = `Checking request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        meta: function(success, error) {
            $.ajax({
                url: "/auto-annotation/meta/get",
                type: "GET",
                success: success,
                error: (data) => {
                    if (error) {
                        let message = `Getting meta request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        }
    }
}


window.cvat.dashboard.uiCallbacks.push(function(newElements) {

});
