// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import APIProjects from '../api/projects.js';

function createProjects(token, count) {
    const projects = [];
    for (let i = 0; i < count; i++) {
        const projectID = APIProjects.createProject(token);
        projects.push(projectID);
    }
    return projects;
}

export default { createProjects };
