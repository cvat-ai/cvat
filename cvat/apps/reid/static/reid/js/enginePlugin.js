"use strict";

document.addEventListener("DOMContentLoaded", () => {
    let rqId = null;

    function run(reidButton) {
        // make treshold and value distance
        let collection = window.cvat.data.get();
        let data = {
            treshold: 0.5,
            max_distance: 100,
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
        })
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
            confirm("ReID process will be canceld. Are you sure?", () => cancel(reidButton));
        }
        else {
            confirm("All boxes will be translated to paths. Are you sure?", () => run(reidButton));
        }
    }).addClass("menuButton semiBold h2").prependTo(buttonsUI);
});
