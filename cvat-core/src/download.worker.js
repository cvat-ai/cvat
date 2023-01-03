// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const Axios = require('axios');

Axios.defaults.withCredentials = true;
Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
Axios.defaults.xsrfCookieName = 'csrftoken';

onmessage = (e) => {
    Axios.get(e.data.url, e.data.config)
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
