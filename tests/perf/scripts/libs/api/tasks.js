// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import { validateResponse } from '../../utils/validation.js';
import { BASE_URL } from '../../variables/constants.js';

function getDefaultHeaders(token) {
    return {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
    };
}

function createTask(token, taskSpec) {
    const response = http.post(`${BASE_URL}/tasks`, JSON.stringify(taskSpec), {
        headers: getDefaultHeaders(token),
    });
    if (validateResponse(response, 201, 'Create Task')) {
        return response.json().id;
    }
    return null;
}

function patchTask(token, taskId, taskUpdatesSpec) {
    const response = http.patch(
        `${BASE_URL}/tasks/${taskId}`,
        JSON.stringify(taskUpdatesSpec),
        {
            headers: getDefaultHeaders(token),
        },
    );

    if (validateResponse(response, 200, 'Patch Task')) {
        return response.json();
    }
    return null;
}

function getTask(token, taskId) {
    const response = http.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: getDefaultHeaders(token),
    });
    if (validateResponse(response, 200, 'Get Task')) {
        return response.json();
    }
    return null;
}

function getTasks(token) {
    const response = http.get(`${BASE_URL}/tasks`, {
        headers: getDefaultHeaders(token),
    });
    if (validateResponse(response, 200, 'Get Tasks')) {
        return response.json();
    }
    return null;
}

function deleteTask(token, taskId) {
    const response = http.del(`${BASE_URL}/tasks/${taskId}`, JSON.stringify({}), {
        headers: getDefaultHeaders(token),
    });
    return validateResponse(response, 204, 'Delete Task');
}

export default {
    createTask,
    getTask,
    getTasks,
    patchTask,
    deleteTask,
};
