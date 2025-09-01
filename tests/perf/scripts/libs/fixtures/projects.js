// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import APIProjects from '../api/projects.js';
import Random from '../../utils/random.js';

function createProjects(token, count) {
    const projectSpec = {
        name: 'testProject',
        labels: [{
            name: 'cat',
            type: 'rectangle',
            attributes: [],
        }],
    };
    const projects = [];
    for (let i = 0; i < count; i++) {
        const projectID = APIProjects.createProject(token, projectSpec);
        projects.push(projectID);
    }
    return projects;
}

function createRandomProject(token) {
    const randomProjectSpec = {
        name: `project_${randomString(8)}`,
        labels: [{
            name: `label_${randomString(5)}`,
            type: `${Random.randomSample()}`,
            attributes: [],
        }],
    };
    const project = APIProjects.createProject(token, randomProjectSpec);
}

export default { createProjects };
