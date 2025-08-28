// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6"/>
/// <reference types="../../types.d.ts" />

import APIProjects from '../../libs/api/projects.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

export const options = {
    scenarios: {
        test: {
            executor: 'constant-arrival-rate',
            duration: '30s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
    },
};

function createProjects(token, count) {
    const projects = [];
    for (let i = 0; i < count; i++) {
        const projectID = APIProjects.createProject(token);
        projects.push(projectID);
    }
    return projects;
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdProjects = createProjects(token, 30);
    return { token, resources: createdProjects };
}

export default function (data) {
    const randomProject = data.resources[__VU % data.resources.length];
    const projectData = APIProjects.getProject(data.token, randomProject);
}
