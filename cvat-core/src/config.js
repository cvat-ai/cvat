/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


const clientID = +Date.now().toString().substr(-6);

module.exports = {
    backendAPI: 'http://localhost:7000/api/v1',
    proxy: false,
    taskID: undefined,
    jobID: undefined,
    clientID: {
        get: () => clientID,
    },
};
