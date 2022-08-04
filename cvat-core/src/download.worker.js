// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const Axios = require('axios');

Axios.defaults.withCredentials = true;
Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
Axios.defaults.xsrfCookieName = 'csrftoken';

onmessage = (e) => {
    let config = {...e.data.config};
    if (config.removeAuthHeader) {
        delete config.removeAuthHeader;
        config.transformRequest = (data, headers) => {
            delete headers.common['Authorization'];
            return data;
        };
    }
    Axios.get(e.data.url, config)
        .then((response) => {
            postMessage({
                responseData: response.data,
                id: e.data.id,
                isSuccess: true,
            });
        })
        .catch((error) => {
            postMessage({
                id: e.data.id,
                status: error.response.status,
                responseData: error.response.data,
                isSuccess: false,
            });
        });
};
