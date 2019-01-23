"use strict";

document.addEventListener("DOMContentLoaded", () => {
    let rqId = null;

    function run(reidButton, tresholdInput, distanceInput) {
        // make treshold and value distance
        let collection = window.cvat.data.get();
        let data = {
            treshold: +tresholdInput.prop("value"),
            max_distance: +distanceInput.prop("value"),
            boxes: collection.boxes,
        };

        reidButton.prop("disabled", true);
        $.ajax({
            url: "reid/create/job/" + window.cvat.job.id,
            type: "POST",
            success: (data) => {
                reidButton.addClass("run").text("Cancel ReID Merge").prop("disabled", false);
                rqId = data.rq_id;

                function checkCallback() {
                    $.ajax({
                        url: "/reid/check/" + rqId,
                        type: "GET",
                        success: (data) => {
                            if (data["progress"]) {
                                reidButton.text(`Cancel ReID Merge (${data["progress"].toString().slice(0,4)}%)`);
                            }
                            
                            if (["queued", "started"].includes(data["status"])) {
                                setTimeout(checkCallback, 1000);
                            }
                            else {
                                reidButton.removeClass("run").text("Run ReID Merge");
                                
                                if (data["status"] === "finished") {
                                    collection.boxes = [];
                                    collection.box_paths = collection.box_paths.concat(JSON.parse(data["result"]));
                                    window.cvat.data.clear();
                                    window.cvat.data.set(collection);
                                    showMessage("ReID merge has done.");
                                }
                                else if (data["status"] === "failed") {
                                    let message = `ReID merge has fallen. Error: '${data["stderr"]}'`;
                                    showMessage(message);
                                    throw Error(message);
                                }
                                else {
                                    let message = `Check request returned '${data["status"]}' status.`;
                                    showMessage(message);
                                    throw Error(message);
                                }
                            }
                        },
                        error: (data) => {
                            let message = `Can not check ReID merge. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                            showMessage(message);
                            throw Error(message);
                        }
                    });
                }

                setTimeout(checkCallback, 1000);
            },
            error: (data) => {
                reidButton.prop("disabled", false);
                let message = `Can not start ReID merge. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            },
            data: JSON.stringify(data),
            contentType: "application/json"
        });
    }

    function cancel(reidButton) {
        reidButton.prop("disabled", true);
        $.ajax({
            url: "/reid/cancel/" + rqId,
            type: "GET",
            success: () => {
                reidButton.removeClass("run").text("Run ReID Merge").prop("disabled", false);
            },
            error: (data) => {
                reidButton.prop("disabled", false);
                let message = `Can not cancel ReID process. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            }
        });
    }

    let buttonsUI = $("#engineMenuButtons");
    let reidButton = $("<button> Run ReID Merge </button>").on("click", () => {
        $('#taskAnnotationMenu').addClass('hidden');
        if (reidButton.hasClass("run")) {
            $("#annotationMenu").addClass("hidden");
            confirm("ReID process will be canceld. Are you sure?", () => cancel(reidButton));
        }
        else {
            $("#annotationMenu").addClass("hidden");
            $(`#${reidWindowId}`).removeClass("hidden");
        }
    }).addClass("menuButton semiBold h2").prependTo(buttonsUI);

    let reidWindowId = "reidSubmitWindow";
    let reidTresholdValueId = "reidTresholdValue";
    let reidDistanceValueId = "reidDistanceValue";
    let reidCancelMergeId = "reidCancelMerge";
    let reidSubmitMergeId = "reidSubmitMerge";

    $(`
        <div class="modal hidden" id="${reidWindowId}">
            <div class="modal-content" style="width: 300px; height: 170px;">
                <table>
                    <tr>
                        <td> <label class="regular h2"> Treshold: </label> </td>
                        <td> <input id="${reidTresholdValueId}" class="regular h1" type="number" min="0.05" max="0.95" value="0.5" step="0.05"> </td>
                    </tr>
                    <tr>
                        <td> <label class="regular h2"> Max Distance </label> </td>
                        <td> <input id="${reidDistanceValueId}" class="regular h1" type="number" min="10" max="1000" value="50" step="10"> </td>
                    </tr>
                    <tr>
                        <td colspan="2"> <label class="regular h2" style="color: red;"> All boxes will be translated to box paths. Continue? </label> </td>
                    </tr>
                </table>
                <center style="margin-top: 10px;">
                    <button id="${reidCancelMergeId}" class="regular h2"> Cancel </button>
                    <button id="${reidSubmitMergeId}" class="regular h2"> Merge </button>
                </center>
            </div>
        </div>
    `).appendTo('body');

    $(`#${reidCancelMergeId}`).on("click", () => {
        $(`#${reidWindowId}`).addClass("hidden");
    });

    $(`#${reidSubmitMergeId}`).on("click", () => {
        $(`#${reidWindowId}`).addClass("hidden");
        run(reidButton, $(`#${reidTresholdValueId}`), $(`#${reidDistanceValueId}`));
    });
});
