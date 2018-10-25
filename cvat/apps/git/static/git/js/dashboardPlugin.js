/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    $(`
        <tr>
            <td> <label class="regular h2"> Git Repos: </label> </td>
            <td> <input type="text" id="gitAnnoReposInput" class="regular" style="width: 90%", placeholder="github.com/user/repos"/> </td>
        </tr>
    `).insertAfter($("#dashboardBugTrackerInput").parent().parent());

    let originalCreateTaskRequest = createTaskRequest;

    window.createTaskRequest = function(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
        let originalOnSuccessCreate = onSuccessCreate;

        onSuccessCreate = (tid) => {
            let gitURL = $('#gitAnnoReposInput').prop('value');

            if (gitURL.length) {
                $.ajax({
                    type: 'POST',
                    url: '/git/repository/create',
                    data: JSON.stringify({
                        'tid': tid,
                        'url': gitURL,
                    }),
                    contentType: 'application/json;charset=utf-8',
                    error: (data) => {
                        throw Error(`Warning: Can't create git record for task ${tid}: ${data.responseText}`);
                    },
                    complete: () => {
                        originalOnSuccessCreate();
                    }
                });
            }
        }

        originalCreateTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus);
    }
});
