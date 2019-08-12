/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

module.exports = {
    backendAPI: 'http://localhost:7000/api/v1',
    proxy: false,
    taskID: undefined,
    jobID: undefined,
    clientID: +Date.now().toString().substr(-6),
};
