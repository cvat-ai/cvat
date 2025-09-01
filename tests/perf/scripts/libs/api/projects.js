// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="../../types.d.ts" />
/// <reference types="k6" />

import { check } from 'k6';
import http from 'k6/http';

import { BASE_URL } from '../../variables/constants.js';

function createProject(authKey, projectSpec) {
    const response = http.post(`${BASE_URL}projects`, JSON.stringify(projectSpec), {
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

function getProject(authKey, projectId) {
    const response = http.get(`${BASE_URL}projects/${projectId}`, {
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

function listProjects(authKey, params = {}) {
    const query = Object.entries(params)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&');
    const url = query ? `${BASE_URL}projects?${query}` : `${BASE_URL}projects`;
    const response = http.get(url, {
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

function updateProject(authKey, projectId, updateSpec) {
    const response = http.patch(`${BASE_URL}projects/${projectId}`, JSON.stringify(updateSpec), {
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

function deleteProject(authKey, projectId) {
    const response = http.del(`${BASE_URL}projects/${projectId}`, null, {
        headers: {
            Authorization: `Token ${authKey}`,
            'Content-Type': 'application/json',
        },
    });
    check(response, {
        'is status 204': (r) => r.status === 204,
    });
    return response;
}

export default {
    createProject,
    getProject,
    listProjects,
    updateProject,
    deleteProject,
};
