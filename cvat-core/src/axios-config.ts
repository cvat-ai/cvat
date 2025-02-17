// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Axios from 'axios';
import axiosRetry from 'axios-retry';

Axios.defaults.withCredentials = true;
Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
Axios.defaults.xsrfCookieName = 'csrftoken';

axiosRetry(Axios, {
    retryCondition: (error) => error.response && error.response.status === Axios.HttpStatusCode.TooManyRequests,
    retryDelay: (retryCount, error) => {
        const retryAfterValue = error.response.headers['retry-after'];

        // Retry-After is allowed to be a decimal integer as well as a date.
        // We're probably not going to use the latter option, though, so don't bother parsing it.
        if (!retryAfterValue || !/^\d+$/.test(retryAfterValue)) {
            return axiosRetry.exponentialDelay(retryCount, error);
        }

        return parseInt(retryAfterValue, 10) * 1000;
    },
});
