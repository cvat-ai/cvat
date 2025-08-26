// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import { validateResponse } from '../../utils/validation.js';
import { BASE_URL } from '../../variables/constants.js';

function createJob(authKey, jobSpec) {
    const response = http.post(`${BASE_URL}/jobs`, JSON.stringify(jobSpec), {
        headers: {
            'Authorization': `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 201, "Create Job")) {
        return response.json().id;
    }
}

function listJobs(authKey) {
    const response = http.get(`${BASE_URL}/jobs`, {
        headers: {
            'Authorization': `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, "List Jobs")) {
        return response.json();
    }
}

export default { createJob, listJobs }

