// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6"/>
/// <reference types="../../types.d.ts" />

import APIProjects from '../../libs/api/projects.js';
import APIAuth from '../../libs/api/auth.js';
import ProjectsLib from '../../libs/fixtures/projects.js';
import { randomSample } from '../../utils/random.js';

import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

const N_PROJECTS = 100;
const N_PER_USER = 20;

export const options = {
    scenarios: {
        // What does each VU do?

        getProject: {
            exec: 'TestGetProject',
            executor: 'constant-arrival-rate',
            duration: '30s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
        getProjects: {
            exec: 'TestGetProjects',
            executor: 'constant-arrival-rate',
            duration: '30s',
            rate: 1,
            timeUnit: '1s',
            preAllocatedVUs: 5,
            maxVUs: 6,
        },
        createProject: {
            executor: 'constant-arrival-rate',
            exec: 'TestCreateProject',
            duration: '30s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
        updateProject: {
            executor: 'constant-arrival-rate',
            exec: 'TestUpdateProject', // Sobek engine uses this as a named import
            duration: '30s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
    },
};

function getRandomProjectID(projects) {
    return projects[__VU % projects.length];
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdProjects = ProjectsLib.createProjects(token, N_PROJECTS);
    return { token, projects: createdProjects };
}

export function TestGetProject(data) {
    const randomProject = data.projects[__VU % data.projects.length];
    APIProjects.getProject(data.token, randomProject);
}

export function TestGetProjects(data) {
    const randomProjects = randomSample(data.projects, N_PER_USER);
    APIProjects.listProjects(data.token, randomProjects);
}

export function TestCreateProject(data) {
    ProjectsLib.createRandomProject(data.token);
}

export function TestUpdateProject(data) {
    ProjectsLib.updateProjectRandomly(
        data.token,
        getRandomProjectID(data.projects),
    );
}
