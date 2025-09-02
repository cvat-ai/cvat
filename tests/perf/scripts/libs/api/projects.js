// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6" />

import http from 'k6/http';

import { BASE_URL } from '../../variables/constants.js';
import { validateResponse } from '../../utils/validation.js';

function createProject(authKey, projectSpec) {
    const response = http.post(`${BASE_URL}/projects`, JSON.stringify(projectSpec), {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 201, 'Create Project')) {
        return response.json().id;
    }
    return null;
}

function getProject(authKey, projectId) {
    const response = http.get(`${BASE_URL}/projects/${projectId}`, {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, 'Get Project')) {
        return response.json().id;
    }
    return null;
}

function listProjects(authKey, params = {}) {
    const query = Object.entries(params)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&');
    const url = query ? `${BASE_URL}/projects?${query}` : `${BASE_URL}/projects`;
    const response = http.get(url, {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, 'List Projects')) {
        return response.json().id;
    }
    return null;
}

function updateProject(authKey, projectId, updateSpec) {
    const response = http.patch(`${BASE_URL}/projects/${projectId}`, JSON.stringify(updateSpec), {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 200, 'Update Project')) {
        return response.json().id;
    }
    return null;
}

function deleteProject(authKey, projectId) {
    const response = http.del(`${BASE_URL}/projects/${projectId}`, null, {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (validateResponse(response, 204, 'Delete Project')) {
        return response.json().id;
    }
    return null;
}

export default {
    createProject,
    getProject,
    listProjects,
    updateProject,
    deleteProject,
};
