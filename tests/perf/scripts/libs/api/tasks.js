// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import { check } from 'k6';
import http from 'k6/http';

import { defaultTaskSpec } from '../default-specs.js';
import { BASE_URL } from '../../variables/constants.js';

function createTask(authKey) {
    const { taskSpec } = defaultTaskSpec({
        taskName: 'testTask',
        labelName: 'cat',
        labelType: 'rectangle',
    });
    const response = http.post(`${BASE_URL}tasks`, JSON.stringify(taskSpec), {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    check(response, {
        'is status 201': (r) => r.status === 201,
    });
    return response.json().id;
}

function getTask(authKey, taskId) {
    const response = http.get(`${BASE_URL}tasks/${taskId}`, {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    check(response, {
        'is status 200': (r) => r.status === 200,
    });
    return response.json();
}

export default { createTask, getTask };
