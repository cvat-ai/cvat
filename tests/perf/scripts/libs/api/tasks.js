// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import { validateResponse } from '../../utils/validation.js';
import { BASE_URL } from '../../variables/constants.js';

function getDefaultHeaders(authKey) {
    return {
        Authorization: `Token ${authKey}`,
        'Content-Type': 'application/json',
    };
}

function createTask(authKey, taskSpec) {
    const response = http.post(`${BASE_URL}/tasks`, JSON.stringify(taskSpec), {
        headers: getDefaultHeaders(authKey),
    });
    if (validateResponse(response, 201, 'Create Task')) {
        return response.json().id;
    }
}

function patchTask(authKey, taskId, taskUpdatesSpec) {
    const response = http.patch(
        `${BASE_URL}/tasks/${taskId}`,
        JSON.stringify(taskUpdatesSpec),
        {
            headers: getDefaultHeaders(authKey),
        },
    );

    if (validateResponse(response, 200, 'Patch Task')) {
        return response.json();
    }
}

function getTask(authKey, taskId) {
    const response = http.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: getDefaultHeaders(authKey),
    });
    if (validateResponse(response, 200, 'Get Task')) {
        return response.json();
    }
}

function getTasks(authKey) {
    const response = http.get(`${BASE_URL}/tasks`, {
        headers: getDefaultHeaders(authKey),
    });
    if (validateResponse(response, 200, 'Get Tasks')) {
        return response.json();
    }
}

function deleteTask(authKey, taskId) {
    const response = http.del(`${BASE_URL}/tasks/${taskId}`, JSON.stringify({}), {
        headers: getDefaultHeaders(authKey),
    });
    validateResponse(response, 204, 'Delete Task');
}

export default {
    createTask,
    getTask,
    getTasks,
    patchTask,
    deleteTask,
};
