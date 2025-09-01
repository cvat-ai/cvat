// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import { validateResponse } from '../../utils/validation.js';
import { BASE_URL } from '../../variables/constants.js';

function createJob(token, jobSpec) {
    const response = http.post(`${BASE_URL}/jobs`, JSON.stringify(jobSpec), {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 201, 'Create Job')) {
        return response.json().id;
    }
    return null;
}

function listJobs(token) {
    const response = http.get(`${BASE_URL}/jobs`, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, 'List Jobs')) {
        return response.json();
    }
    return null;
}

function getJobDetails(token, jobID) {
    const response = http.get(`${BASE_URL}/jobs/${jobID}`, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, 'Get Job Details')) {
        return response.json();
    }
    return null;
}

export default { createJob, listJobs, getJobDetails };
