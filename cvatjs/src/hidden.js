/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* Some shared cvat.js data which aren't intended for a user */
(() => {
    const hidden = {
        clientID: +Date.now().toString().substr(-6),
        projID: undefined,
        taskID: undefined,
        jobID: undefined,
        location: undefined,
    };

    module.exports = hidden;
})();
