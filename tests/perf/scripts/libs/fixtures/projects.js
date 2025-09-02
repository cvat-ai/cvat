// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6" />

import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { randomBool, randomBugTracker, randomUpdate } from '../../utils/random.js';
import { SHAPE_TYPES, BUG_TRACKER_FAKE_URL, ADMIN_ID } from './const.js';
import APIProjects from '../api/projects.js';

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
            type: randomItem(SHAPE_TYPES),
            attributes: [
                {
                    name: 'occluded',
                    mutable: true,
                    input_type: 'select',
                    default_value: 'false',
                    values: ['true', 'false'],
                },
                {
                    name: 'quality',
                    mutable: true,
                    input_type: 'select',
                    default_value: 'high',
                    values: ['low', 'medium', 'high'],
                },
            ],
            owner_id: 1,
            assignee_id: 1,
            bug_tracker: BUG_TRACKER_FAKE_URL,
            target_storage: {
                location: 'local',
            },
            source_storage: {
                location: 'local',
            },
        }],
    };
    const project = APIProjects.createProject(token, randomProjectSpec);
    return project;
}

function updateProjectRandomly(token, projectID, assigneeID = ADMIN_ID, ownerID = ADMIN_ID) {
    const randomUpdateSpec = randomUpdate({
        name: randomString(8),
        labels: [
            // If we pick labels, pick 1 or 2
            {
                name: `label_${randomString(5)}`,
                type: randomItem(SHAPE_TYPES),
                attributes: [],
            },
            randomBool() ? {
                name: `label_${randomString(5)}`,
                type: randomItem(SHAPE_TYPES),
                attributes: [],
            } : undefined,
        ],
        bug_tracker: randomBugTracker(),
        owner_id: ownerID,
        assignee_id: assigneeID,
    });
    return APIProjects.updateProject(token, projectID, randomUpdateSpec);
}

export default {
    createProjects,
    createRandomProject,
    updateProjectRandomly,
};
