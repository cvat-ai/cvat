/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    showMessage:false
*/

"use strict";

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];
window.cvat.dashboard.uiCallbacks.push(function(newElements) {
    $.ajax({
        type: "GET",
        url: "/git/repository/meta/get",
        success: (data) => {
            newElements.each(function(idx) {
                let elem = $(newElements[idx]);
                let tid = +elem.attr("id").split("_")[1];

                if (tid in data) {
                    if (["sync", "syncing"].includes(data[tid])) {
                        elem.css("background", "floralwhite");
                    }
                    else if (data[tid] === "merged") {
                        elem.css("background", "azure");
                    }
                    else {
                        elem.css("background", "mistyrose");
                    }

                    $("<button> Git Repository Sync </button>").addClass("regular dashboardButtonUI").on("click", () => {
                        let gitDialogWindow = $(`#${window.cvat.git.reposWindowId}`);
                        gitDialogWindow.attr("current_tid", tid);
                        gitDialogWindow.removeClass("hidden");
                        window.cvat.git.updateState();
                    }).appendTo(elem.find("div.dashboardButtonsUI")[0]);
                }
            });
        },
        error: (data) => {
            let message = `Can not get git repositories meta info. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        }
    });


});

window.cvat.git = {
    reposWindowId: "gitReposWindow",
    closeReposWindowButtonId: "closeGitReposButton",
    reposURLTextId: "gitReposURLText",
    reposSyncButtonId: "gitReposSyncButton",
    labelStatusId: "gitReposLabelStatus",
    labelMessageId: "gitReposLabelMessage",
    createURLInputTextId: "gitCreateURLInputText",

    updateState: () => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
        let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);
        let reposURLText = $(`#${window.cvat.git.reposURLTextId}`);
        let syncButton = $(`#${window.cvat.git.reposSyncButtonId}`);

        reposURLText.attr("placeholder", "Waiting for server response..");
        reposURLText.prop("value", "");
        gitLabelMessage.css("color", "#cccc00").text("Waiting for server response..");
        gitLabelStatus.css("color", "#cccc00").text("\u25cc");
        syncButton.attr("disabled", true);

        let tid = gitWindow.attr("current_tid");

        $.get(`/git/repository/get/${tid}`).done(function(data) {
            if (!data.url.value) {
                gitLabelMessage.css("color", "black").text("Repository is not attached");
                reposURLText.prop("value", "");
                reposURLText.attr("placeholder", "Repository is not attached");
                return;
            }

            reposURLText.attr("placeholder", "");
            reposURLText.prop("value", data.url.value);

            if (!data.status.value) {
                gitLabelStatus.css("color", "red").text("\u26a0");
                gitLabelMessage.css("color", "red").text(data.status.error);
                syncButton.attr("disabled", false);
                return;
            }

            if (data.status.value === "!sync") {
                gitLabelStatus.css("color", "red").text("\u2606");
                gitLabelMessage.css("color", "red").text("Repository is not synchronized");
                syncButton.attr("disabled", false);
            }
            else if (data.status.value === "sync") {
                gitLabelStatus.css("color", "#cccc00").text("\u2605");
                gitLabelMessage.css("color", "black").text("Synchronized (merge required)");
            }
            else if (data.status.value === "merged") {
                gitLabelStatus.css("color", "darkgreen").text("\u2605");
                gitLabelMessage.css("color", "darkgreen").text("Synchronized");
            }
            else if (data.status.value === "syncing") {
                gitLabelMessage.css("color", "#cccc00").text("Synchronization..");
                gitLabelStatus.css("color", "#cccc00").text("\u25cc");
            }
            else {
                let message = `Got unknown repository status: ${data.status.value}`;
                gitLabelStatus.css("color", "red").text("\u26a0");
                gitLabelMessage.css("color", "red").text(message);
                throw Error(message);
            }
        }).fail(function(data) {
            gitWindow.addClass("hidden");
            let message = `Error occured during get an repos status. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        });
    },
};


document.addEventListener("DOMContentLoaded", () => {
    $(`
        <tr>
            <td> <label class="regular h2"> Dataset Repository: </label> </td>
            <td> <input type="text" id="${window.cvat.git.createURLInputTextId}" class="regular"` +
                `style="width: 90%", placeholder="github.com/user/repos [annotation/<dump_file_name>.zip]" ` +
                `title = "Field for a repository URL and a relative path inside the repository. Default repository path is 'annotation/<dump_file_name>.zip'. There are .zip or .xml extenstions are supported."/>` +
            `</td>
        </tr>`
    ).insertAfter($("#dashboardBugTrackerInput").parent().parent());

    // Wrap create task request function
    let originalCreateTaskRequest = window.createTaskRequest;
    window.createTaskRequest = function(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
        let gitPath = $(`#${window.cvat.git.createURLInputTextId}`).prop("value").replace(/\s/g, "");
        if (gitPath.length) {
            oData.append("git_path", gitPath);
        }
        originalCreateTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus);
    };

    /* GIT MODAL WINDOW PLUGIN PART */
    $(`<div id="${window.cvat.git.reposWindowId}" class="modal hidden">
        <div style="width: 700px; height: auto;" class="modal-content">
            <div style="width: 100%; height: 60%; overflow-y: auto;">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 20%;">
                            <label class="regular h2"> Repository URL: </label>
                        </td>
                        <td style="width: 80%;" colspan="2">
                            <input class="regular h2" type="text" style="width: 92%;" id="${window.cvat.git.reposURLTextId}" readonly/>
                        </td>
                    </td>
                    <tr>
                        <td style="width: 20%;">
                            <label class="regular h2"> Status: </label>
                        </td>
                        <td style="width: 60%;">
                            <div>
                                <label class="regular h2" id="${window.cvat.git.labelStatusId}"> </label>
                                <label class="regular h2" id="${window.cvat.git.labelMessageId}" style="word-break: break-word; user-select: text;"> </label>
                            </div>
                        </td>
                        <td style="width: 20%;">
                            <button style="width: 70%;" id="${window.cvat.git.reposSyncButtonId}" class="regular h2"> Sync </button>
                        </td>
                    </tr>
                </table>
            </div>
            <center>
                <button id="${window.cvat.git.closeReposWindowButtonId}" class="regular h1" style="margin-top: 15px;"> Close </button>
            </center>
        </div>
    </div>`).appendTo("body");

    let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
    let closeRepositoryWindowButton = $(`#${window.cvat.git.closeReposWindowButtonId}`);
    let repositorySyncButton = $(`#${window.cvat.git.reposSyncButtonId}`);
    let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
    let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);

    closeRepositoryWindowButton.on("click", () => {
        gitWindow.addClass("hidden");
    });

    repositorySyncButton.on("click", () => {
        function badResponse(message) {
            try {
                showMessage(message);
                throw Error(message);
            }
            finally {
                window.cvat.git.updateState();
            }
        }

        gitLabelMessage.css("color", "#cccc00").text("Synchronization..");
        gitLabelStatus.css("color", "#cccc00").text("\u25cc");
        repositorySyncButton.attr("disabled", true);

        let tid = gitWindow.attr("current_tid");
        $.get(`/git/repository/push/${tid}`).done((data) => {
            setTimeout(timeoutCallback, 1000);

            function timeoutCallback() {
                $.get(`/git/repository/check/${data.rq_id}`).done((data) => {
                    if (["finished", "failed", "unknown"].indexOf(data.status) != -1) {
                        if (data.status === "failed") {
                            let message = data.error;
                            badResponse(message);
                        }
                        else if (data.status === "unknown") {
                            let message = `Request for pushing returned status "${data.status}".`;
                            badResponse(message);
                        }
                        else {
                            window.cvat.git.updateState();
                        }
                    }
                    else {
                        setTimeout(timeoutCallback, 1000);
                    }
                }).fail((data) => {
                    let message = `Error was occured during pushing an repos entry. ` +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                    badResponse(message);
                });
            }
        }).fail((data) => {
            let message = `Error was occured during pushing an repos entry. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            badResponse(message);
        });
    });
});
