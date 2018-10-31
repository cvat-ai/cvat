/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];
window.cvat.dashboard.uiCallbacks.push(function(newElements) {
    newElements.each(function(idx) {
        let elem = $(newElements[idx]);
        let tid = +elem.attr('id').split('_')[1];

        $('<button> Git Repository Sync </button>').addClass('regular dashboardButtonUI')
            .on('click', () => {
                let gitDialogWindow = $(`#${window.cvat.git.reposWindowId}`);
                gitDialogWindow.attr('current_tid', tid);
                gitDialogWindow.removeClass('hidden');
                window.cvat.git.updateState();
            }).appendTo(elem.find('div.dashboardButtonsUI')[0]);
    });
});

window.cvat.git = {
    reposWindowId: 'gitReposWindow',
    closeReposWindowButtonId: 'closeGitReposButton',
    reposURLInputTextId: 'gitReposInputText',
    reposURLUpdateButtonId: 'gitReposUpdateButton',
    reposPushButtonId: 'gitReposPushButton',
    labelStatusId: 'gitReposLabelStatus',
    labelMessageId: 'gitReposLabelMessage',
    createURLInputTextId: 'gitCreateURLInputText',

    updateState: () => {
         /* Used unicode characters:
            updating: &#9202;
            pushed: &#10003;
            actual: &#9733;
            obsolete: &#9734;
            error: &#9888;
        */

        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
        let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);
        let reposURLInput = $(`#${window.cvat.git.reposURLInputTextId}`);
        let updateButton = $(`#${window.cvat.git.reposURLUpdateButtonId}`);
        let pushButton = $(`#${window.cvat.git.reposPushButtonId}`);

        gitLabelMessage.css('color', '#cccc00').text('Getting an info..');
        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
        updateButton.attr("disabled", true);
        pushButton.attr("disabled", true);

        window.cvat.git.getGitURL((data) => {
            updateButton.attr("disabled", false);

            if (!data.url.value) {
                gitLabelMessage.css('color', 'black').text('Repository is not attached');
                reposURLInput.attr('placeholder', 'Repository is not attached');
                return;
            }

            reposURLInput.attr('placeholder', '');
            reposURLInput.prop('value', data.url.value);

            if (!data.status.value) {
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(data.status.error);
                return;
            }

            if (data.status.value == "actual") {
                gitLabelStatus.css('color', 'darkgreen').text('\u2605');
                gitLabelMessage.css('color', 'darkgreen').text('Repository contains actual data');
            }
            else if (data.status.value == "obsolete") {
                gitLabelStatus.css('color', 'darkgreen').text('\u2606');
                gitLabelMessage.css('color', 'black').text('Repository contains obsolete data');
                pushButton.attr("disabled", false);
            }
            else {
                let message = `Got unknown repository status: ${data.status.value}`;
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(message);
                throw Error(message);
            }
        }, (data) => {
            updateButton.attr("disabled", false);
            gitWindow.addClass('hidden');
            let message = `Error was occured during get an repos URL. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        });
    },

    getGitURL: (success, error) => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        $.ajax({
            url: '/git/repository/get/' + gitWindow.attr('current_tid'),
            type: 'GET',
            success: success,
            error: error
        });
    },

    removeGitURL: () => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        $.ajax({
            url: '/git/repository/delete/' + gitWindow.attr('current_tid'),
            type: 'DELETE',
            success: window.cvat.git.updateState,
            error: (data) => {
                let message = `Error was occured during deleting an repos entry. ` +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            }
        });
    },

    updateGitURL: (url) => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        $.ajax({
            url: '/git/repository/update',
            type: 'POST',
            data: JSON.stringify({
                'tid': +gitWindow.attr('current_tid'),
                'url': url,
            }),
            success: window.cvat.git.updateState,
            error: (data) => {
                try {
                    let message = `Error was occured during updating an repos entry. ` +
                        `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                    showMessage(message);
                    throw Error(message);
                }
                finally {
                    window.cvat.git.updateState();
                }
            }
        });
    },

    createGitURL: (url) => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        $.ajax({
            url: '/git/repository/create',
            type: 'POST',
            data: JSON.stringify({
                'tid': +gitWindow.attr('current_tid'),
                'url': url,
            }),
            success: window.cvat.git.updateState,
            error: (data) => {
                try {
                    let message = `Error was occured during creating an repos entry. ` +
                        `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                    showMessage(message);
                    throw Error(message);
                }
                finally {
                    window.cvat.git.updateState();
                }
            }
        });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    /* CREATE TASK PLUGIN PART */
    $(`
        <tr>
            <td> <label class="regular h2"> Git Repos: </label> </td>
            <td> <input type="text" id="${window.cvat.git.createURLInputTextId}" class="regular" style="width: 90%", placeholder="github.com/user/repos"/> </td>
        </tr>
    `).insertAfter($("#dashboardBugTrackerInput").parent().parent());

    let originalCreateTaskRequest = window.createTaskRequest;
    window.createTaskRequest = function(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
        try {
            let originalOnSuccessCreate = onSuccessCreate;
            onSuccessCreate = (tid) => {
                let gitURL = $(`#${window.cvat.git.createURLInputTextId}`).prop('value').replace(/\s/g,'');

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
                            console.log(`Warning: Can't create git record for task ${tid}. ` +
                                `Status: ${data.status}. Message: ${data.responseText || data.statusText}`);
                        },
                        complete: () => {
                            originalOnSuccessCreate();
                        }
                    });
                }
                else {
                    originalOnSuccessCreate();
                }
            }
        }
        finally {
            originalCreateTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus);
        }
    }

    /* GIT MODAL WINDOW PLUGIN PART */
    $(`<div id="${window.cvat.git.reposWindowId}" class="modal hidden">
        <div style="width: 700px; height: 120px;" class="modal-content">
            <div style="width: 100%; height: 60%; overflow-y: auto;">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 20%;">
                            <label class="regular h2"> Repository URL: </label>
                        </td>
                        <td style="width: 60%;">
                            <input class="regular h2" type="text" style="width: 90%;" id="${window.cvat.git.reposURLInputTextId}"/>
                        </td>
                        <td style="width: 15%;">
                            <button style="width: 70%;" id="${window.cvat.git.reposURLUpdateButtonId}" class="regular h2"> Update </button>
                        </td>
                    </td>
                    <tr>
                        <td>
                            <label class="regular h2"> Status: </label>
                        </td>
                        <td>
                            <div>
                                <label class="regular h2" id="${window.cvat.git.labelStatusId}"> </label>
                                <label class="regular h2" id="${window.cvat.git.labelMessageId}"> </label>
                            </div>
                        </td>
                        <td>
                            <button style="width: 70%;" id="${window.cvat.git.reposPushButtonId}" class="regular h2"> Push </button>
                        </td>
                    </tr>
                </table>
            </div>
            <center>
                <button id="${window.cvat.git.closeReposWindowButtonId}" class="regular h1" style="margin-top: 15px;"> Close </button>
            </center>
        </div>
    </div>`).appendTo('body');

    let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
    let closeRepositoryWindowButton = $(`#${window.cvat.git.closeReposWindowButtonId}`);
    let repositoryURLInput = $(`#${window.cvat.git.reposURLInputTextId}`);
    let repositoryUpdateButton = $(`#${window.cvat.git.reposURLUpdateButtonId}`);
    let repositoryPushButton = $(`#${window.cvat.git.reposPushButtonId}`);
    let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
    let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);

    closeRepositoryWindowButton.on('click', () => {
        gitWindow.addClass('hidden');
    });

    repositoryUpdateButton.on('click', () => {
        gitLabelMessage.css('color', '#cccc00').text('Updating..');
        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
        repositoryUpdateButton.attr("disabled", true);
        repositoryPushButton.attr("disabled", true);

        let gitURL = repositoryURLInput.prop('value').replace(/\s/g,'');
        if (!gitURL) {
            window.cvat.git.removeGitURL();
        }
        else {
            window.cvat.git.getGitURL((data) => {
                if (!data.url.value) {
                    window.cvat.git.createGitURL(gitURL);
                }
                else {
                    window.cvat.git.updateGitURL(gitURL);
                }
            }, () => {
                let message = `Error was occured during getting an git URL. ` +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            });
        }
    });

    repositoryPushButton.on('click', () => {
        // to do
    });
});
