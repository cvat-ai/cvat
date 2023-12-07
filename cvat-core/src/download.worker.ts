// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Axios from 'axios';

Axios.defaults.withCredentials = true;
Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
Axios.defaults.xsrfCookieName = 'csrftoken';

onmessage = (e) => {
    Axios.get(e.data.url, e.data.config)
        .then((response) => {
            postMessage({
                responseData: response.data,
                headers: response.headers,
                id: e.data.id,
                isSuccess: true,
            });
        })
        .catch((error) => {
            postMessage({
                id: e.data.id,
                message: error.message,
                code: error.code,
                isSuccess: false,
            });
        });
};
