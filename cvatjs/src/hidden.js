/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

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
