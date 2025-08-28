// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6"/>
/// <reference types="../../types.d.ts" />

import APIProjects from '../../libs/api/projects.js';
import APIAuth from '../../libs/api/auth.js';
import ProjectsLib from '../../libs/fixtures/projects.js';
import Random from '../../utils/random.js';

import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

const N_PROJECTS = 100;
const N_PER_USER = 20;

export const options = {
    scenarios: {
        // What does each VU do?

        // getProject: {
        //     exec: 'TestGetProject',
        //     executor: 'constant-arrival-rate',
        //     duration: '30s',
        //     rate: 5,
        //     timeUnit: '1s',
        //     preAllocatedVUs: 10,
        //     maxVUs: 100,
        // },
        getProjects: {
            exec: 'TestGetProjects',
            executor: 'constant-arrival-rate',
            duration: '30s',
            rate: 1,
            timeUnit: '5s',
            preAllocatedVUs: 5,
            maxVUs: 6,
        },
    },
};

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdProjects = ProjectsLib.createProjects(token, N_PROJECTS);
    return { token, resources: createdProjects };
}

export function TestGetProject(data) {
    const randomProject = data.resources[__VU % data.resources.length];
    const projectData = APIProjects.getProject(data.token, randomProject);
}

export function TestGetProjects(data) {
    const randomProjects = Random.randomSample(data.resources, N_PER_USER);
    const projectsData = APIProjects.listProjects(data.token, randomProjects);
    console.log(projectsData); // TODO: stash pop verbose flag from local git
}
